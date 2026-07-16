import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { DbCleaner } from '../../helpers/db-cleaner';
import { TestHarness } from '../../helpers/test-harness';
import { OrderStatus } from '../../../src/orders/enums/order-status.enum';

describe('Orders Domain (e2e)', () => {
    let app: INestApplication;
    let dbCleaner: DbCleaner;
    let httpServer: any;

    let staffToken: string;
    let customer1Token: string;
    let customer2Token: string;

    let testPhysicalProductId: string;
    let testServiceProductId: string;
    let initialProductPrice = 1000.00;

    beforeAll(async () => {
        const harness = TestHarness.getInstance();
        app = await harness.start();
        httpServer = app.getHttpServer();
        dbCleaner = new DbCleaner(app.get(DataSource));

        // 1. Authenticate Actors
        const staffRes = await request(httpServer).post('/auth/login').send({ email: 'staff@teste.com', password: 'teste123' });
        staffToken = staffRes.body.access_token;

        const customer1Res = await request(httpServer).post('/auth/login').send({ email: 'customer@teste.com', password: 'teste123' });
        customer1Token = customer1Res.body.access_token;

        // Create a second customer to test IDOR (BR-12)
        await request(httpServer).post('/users').send({ fullName: 'Customer Two', email: 'customer2@teste.com', password: 'teste123' });
        const customer2Res = await request(httpServer).post('/auth/login').send({ email: 'customer2@teste.com', password: 'teste123' });
        customer2Token = customer2Res.body.access_token;

        // 2. Create reliable products for our order tests
        const physRes = await request(httpServer)
            .post('/products')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ name: 'Order Test Physical', price: initialProductPrice, type: 'PHYSICAL_GOODS', stockQuantity: 10 });
        testPhysicalProductId = physRes.body.id;

        const servRes = await request(httpServer)
            .post('/products')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ name: 'Order Test Service', price: 500, type: 'SERVICE', estimatedDurationHours: 5 });
        testServiceProductId = servRes.body.id;
    });

    afterEach(async () => {
        // We only clear order-related tables to keep products and users intact
        const dataSource = app.get(DataSource);
        await dataSource.query(`TRUNCATE TABLE "order_items" CASCADE;`);
        await dataSource.query(`TRUNCATE TABLE "order_messages" CASCADE;`);
        await dataSource.query(`TRUNCATE TABLE "orders" CASCADE;`);
    });

    afterAll(async () => {
        await TestHarness.getInstance().stop();
    });

    describe('Cart Management (BR-07 & BR-12)', () => {
        it('should create a new DRAFT cart if none exists', async () => {
            const payload = { items: [{ productId: testPhysicalProductId, quantity: 2 }] };

            const response = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send(payload)
                .expect(201); // Or 200 depending on your controller setup

            expect(response.body.status).toBe(OrderStatus.DRAFT);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].quantity).toBe(2);
        });

        it('should enforce BR-07 (Smart Upsert): updating cart should not create duplicate orders', async () => {
            // First request
            await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testPhysicalProductId, quantity: 1 }] });

            // Second request (Upsert)
            const response = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testServiceProductId, quantity: 3 }] })
                .expect(201); // Or 200

            // The cart should now ONLY contain the service item (overwritten/synced)
            expect(response.body.status).toBe(OrderStatus.DRAFT);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].productId).toBe(testServiceProductId);
            expect(response.body.items[0].quantity).toBe(3);
        });

        it('should enforce BR-12: block a user from removing an item from another users cart', async () => {
            // Customer 1 creates a cart
            const cartRes = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testPhysicalProductId, quantity: 1 }] });

            const itemId = cartRes.body.items[0].id;

            // Customer 2 attempts to delete Customer 1's item
            await request(httpServer)
                .delete(`/orders/cart/items/${itemId}`)
                .set('Authorization', `Bearer ${customer2Token}`)
                .expect(404); // Expecting 404 Not Found to prevent IDOR scanning
        });
    });

    describe('Checkout Phase (BR-05 & BR-08)', () => {
        it('should enforce BR-08: prevent checkout of an empty cart', async () => {
            // Create cart
            const cartRes = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testPhysicalProductId, quantity: 1 }] });

            const orderId = cartRes.body.id;
            const itemId = cartRes.body.items[0].id;

            // Empty the cart
            await request(httpServer)
                .delete(`/orders/cart/items/${itemId}`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .expect(200);

            // Attempt checkout
            const response = await request(httpServer)
                .patch(`/orders/${orderId}/checkout`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .expect(400); // Expecting BadRequest due to empty items

            expect(response.body.message).toBeDefined();
        });

        it('should transition DRAFT to PENDING and enforce BR-05 (Chronological Price Freezing)', async () => {
            // 1. Create a cart with the physical item
            const cartRes = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testPhysicalProductId, quantity: 2 }] });

            const orderId = cartRes.body.id;

            // 2. Perform Checkout
            await request(httpServer)
                .patch(`/orders/${orderId}/checkout`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .expect(200);

            // 3. STAFF maliciously changes the global catalog price AFTER checkout
            await request(httpServer)
                .patch(`/products/${testPhysicalProductId}`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ price: 9999.99 })
                .expect(200);

            // 4. Retrieve the order details
            const orderRes = await request(httpServer)
                .get(`/orders/${orderId}`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .expect(200);

            // 5. Assertions: Status advanced, and frozen price remained the original one
            expect(orderRes.body.status).toBe(OrderStatus.PENDING);
            expect(Number(orderRes.body.items[0].priceAtPurchase)).toBe(initialProductPrice);
        });
    });

    describe('Negotiation & Communication (BR-06 & BR-09)', () => {
        let orderId: string;

        beforeEach(async () => {
            // Setup: Create a fresh PENDING order before each test in this block
            const cartRes = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testServiceProductId, quantity: 1 }] });
            orderId = cartRes.body.id;

            await request(httpServer)
                .patch(`/orders/${orderId}/checkout`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .expect(200);
        });

        it('should enforce BR-09: reject messages if order is not IN_NEGOTIATION', async () => {
            // Order is currently PENDING, timeline should be closed
            const response = await request(httpServer)
                .post(`/orders/${orderId}/messages`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ content: 'Can we negotiate the volume?' })
                .expect(400); // Domain validation should block this

            expect(response.body.message).toBeDefined();
        });

        it('should allow bidirectional messaging when IN_NEGOTIATION', async () => {
            // 1. Staff moves order to IN_NEGOTIATION
            await request(httpServer)
                .patch(`/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: OrderStatus.IN_NEGOTIATION })
                .expect(200);

            // 2. Customer sends a message
            await request(httpServer)
                .post(`/orders/${orderId}/messages`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ content: 'I need 5 units instead of 1.' })
                .expect(201); // Or 200 depending on controller

            // 3. Staff replies
            const staffMsgRes = await request(httpServer)
                .post(`/orders/${orderId}/messages`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ content: 'We can do that.' })
                .expect(201);

            expect(staffMsgRes.body.content).toBe('We can do that.');
        });

        it('should enforce BR-06: STAFF can update item quantities during negotiation', async () => {
            // 1. Staff moves to IN_NEGOTIATION
            await request(httpServer)
                .patch(`/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: OrderStatus.IN_NEGOTIATION })
                .expect(200);

            // 2. Staff updates the item volume
            await request(httpServer)
                .patch(`/orders/${orderId}/items`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ items: [{ productId: testServiceProductId, quantity: 5 }] })
                .expect(200);

            // 3. Fetch the order details to validate the updated quantities
            const fetchRes = await request(httpServer)
                .get(`/orders/${orderId}`)
                .set('Authorization', `Bearer ${staffToken}`)
                .expect(200);

            // Validate the quantity changed in the database.
            expect(fetchRes.body.items).toBeDefined();
            expect(fetchRes.body.items[0].quantity).toBe(5);
        });

        it('should enforce DTO limits: block messages exceeding 2000 characters', async () => {
            // 1. Staff moves order to IN_NEGOTIATION to open the timeline
            await request(httpServer)
                .patch(`/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: OrderStatus.IN_NEGOTIATION });

            // 2. Generate a payload of 2001 characters
            const oversizedContent = 'a'.repeat(2001);

            // 3. Attempt to send it
            const response = await request(httpServer)
                .post(`/orders/${orderId}/messages`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ content: oversizedContent })
                .expect(400); // ValidationPipe must block it before hitting the database

            expect(JSON.stringify(response.body.message)).toContain('2000 characters');
        });
    });

    describe('Autonomy & Cancellation (BR-10 & BR-11)', () => {
        it('should enforce BR-11: prevent cancellation of a DRAFT order', async () => {
            // 1. Create DRAFT
            const cartRes = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testPhysicalProductId, quantity: 1 }] });
            const draftOrderId = cartRes.body.id;

            // 2. Attempt cancellation (Should fail because DRAFTs are just cleared, not canceled)
            await request(httpServer)
                .patch(`/orders/${draftOrderId}/cancel`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .expect(400);
        });

        it('should allow customer to cancel a PENDING order', async () => {
            // Setup PENDING order
            const cartRes = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testPhysicalProductId, quantity: 1 }] });
            const orderId = cartRes.body.id;

            await request(httpServer).patch(`/orders/${orderId}/checkout`).set('Authorization', `Bearer ${customer1Token}`);

            // Cancel it
            const response = await request(httpServer)
                .patch(`/orders/${orderId}/cancel`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .expect(200);

            expect(response.body.status).toBe(OrderStatus.REJECTED);
        });

        it('should enforce BR-10: allow customer to approve an IN_NEGOTIATION order', async () => {
            // Setup IN_NEGOTIATION order
            const cartRes = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testServiceProductId, quantity: 1 }] });
            const orderId = cartRes.body.id;

            await request(httpServer).patch(`/orders/${orderId}/checkout`).set('Authorization', `Bearer ${customer1Token}`);
            await request(httpServer).patch(`/orders/${orderId}/status`).set('Authorization', `Bearer ${staffToken}`).send({ status: OrderStatus.IN_NEGOTIATION });

            // Customer approves
            const response = await request(httpServer)
                .patch(`/orders/${orderId}/approve`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .expect(200);

            expect(response.body.status).toBe(OrderStatus.APPROVED);
        });
    });

    describe('Inventory & Stock Management (BR-01, BR-03 & BR-04)', () => {
        let physicalOrderId: string;
        let serviceOrderId: string;

        beforeEach(async () => {
            // Setup Physical Order
            const physCart = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testPhysicalProductId, quantity: 2 }] });
            physicalOrderId = physCart.body.id;
            await request(httpServer).patch(`/orders/${physicalOrderId}/checkout`).set('Authorization', `Bearer ${customer1Token}`);

            // Setup Service Order
            const servCart = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer2Token}`) // Different customer to avoid cart merging
                .send({ items: [{ productId: testServiceProductId, quantity: 1 }] });
            serviceOrderId = servCart.body.id;
            await request(httpServer).patch(`/orders/${serviceOrderId}/checkout`).set('Authorization', `Bearer ${customer2Token}`);
        });

        it('should enforce BR-03: deduct stock strictly upon transition to APPROVED', async () => {
            // 1. Check initial stock directly from the product catalog
            const initialProdRes = await request(httpServer)
                .get('/products/all') // Assuming STAFF can see all details
                .set('Authorization', `Bearer ${staffToken}`)
                .expect(200);

            const targetProductBefore = initialProdRes.body.data.find((p: any) => p.id === testPhysicalProductId);
            const initialStock = targetProductBefore.stockQuantity;

            // 2. Staff approves the order
            await request(httpServer)
                .patch(`/orders/${physicalOrderId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: OrderStatus.APPROVED, fulfillmentDetails: 'Ready for dispatch' })
                .expect(200);

            // 3. Verify the stock was deducted by exactly 2 units
            const finalProdRes = await request(httpServer)
                .get('/products/all')
                .set('Authorization', `Bearer ${staffToken}`)
                .expect(200);

            const targetProductAfter = finalProdRes.body.data.find((p: any) => p.id === testPhysicalProductId);
            expect(targetProductAfter.stockQuantity).toBe(initialStock - 2);
        });

        it('should enforce BR-04: instantly restore stock if an APPROVED order is REJECTED', async () => {
            // 1. Staff approves (deducts stock)
            await request(httpServer)
                .patch(`/orders/${physicalOrderId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: OrderStatus.APPROVED, fulfillmentDetails: 'Packing...' })
                .expect(200);

            // Fetch intermediate stock state
            const midProdRes = await request(httpServer).get('/products/all').set('Authorization', `Bearer ${staffToken}`);
            const midStock = midProdRes.body.data.find((p: any) => p.id === testPhysicalProductId).stockQuantity;

            // 2. Transaction fails (e.g., payment default) -> Staff rejects the order
            await request(httpServer)
                .patch(`/orders/${physicalOrderId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: OrderStatus.REJECTED, rejectionReason: 'Payment Default' })
                .expect(200);

            // 3. Verify stock was restored
            const finalProdRes = await request(httpServer).get('/products/all').set('Authorization', `Bearer ${staffToken}`);
            const finalStock = finalProdRes.body.data.find((p: any) => p.id === testPhysicalProductId).stockQuantity;

            expect(finalStock).toBe(midStock + 2); // The 2 units returned to the shelf
        });

        it('should enforce BR-01: approving a SERVICE order does not affect stock logic', async () => {
            // Service order approval should process seamlessly without throwing stock validation errors
            const response = await request(httpServer)
                .patch(`/orders/${serviceOrderId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: OrderStatus.APPROVED, fulfillmentDetails: 'Service scheduled for tomorrow' })
                .expect(200);

            expect(response.body.status).toBe(OrderStatus.APPROVED);
        });
    });

    describe('Retrieval & Security Boundaries (GET Endpoints)', () => {
        let customer1OrderId: string;

        beforeAll(async () => {
            // Setup: Create a specific order for Customer 1 to test IDOR and retrieval
            const cartRes = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testPhysicalProductId, quantity: 1 }] });

            customer1OrderId = cartRes.body.id;

            // Move it to PENDING so it's a formalized order
            await request(httpServer)
                .patch(`/orders/${customer1OrderId}/checkout`)
                .set('Authorization', `Bearer ${customer1Token}`);
        });

        it('should enforce IDOR: prevent Customer 2 from fetching Customer 1 details', async () => {
            // Customer 2 attempts to GET Customer 1's specific order
            const response = await request(httpServer)
                .get(`/orders/${customer1OrderId}`)
                .set('Authorization', `Bearer ${customer2Token}`)
                .expect(403); // Backend strictly identifies the permission boundary

            expect(response.body.message).toBeDefined();
        });

        it('should strictly isolate the my-orders list to the authenticated customer', async () => {
            // Customer 2 fetches their list
            const response = await request(httpServer)
                .get('/orders/my-orders')
                .set('Authorization', `Bearer ${customer2Token}`)
                .expect(200);

            // Data array must NOT contain Customer 1's order
            const orders = response.body.data || response.body.items || response.body;
            expect(Array.isArray(orders)).toBe(true);

            const foundCustomer1Order = orders.find((o: any) => o.id === customer1OrderId);
            expect(foundCustomer1Order).toBeUndefined();
        });

        it('should correctly retrieve the active cart via GET /orders/cart', async () => {
            // Setup a new draft for Customer 2
            await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer2Token}`)
                .send({ items: [{ productId: testServiceProductId, quantity: 2 }] });

            // Fetch the cart using the GET endpoint
            const response = await request(httpServer)
                .get('/orders/cart')
                .set('Authorization', `Bearer ${customer2Token}`)
                .expect(200);

            expect(response.body.status).toBe(OrderStatus.DRAFT);
            expect(response.body.items).toBeDefined();
            expect(response.body.items[0].productId).toBe(testServiceProductId);
            expect(response.body.items[0].quantity).toBe(2);
        });
    });

    describe('State Machine & Audit Retrieval Edge Cases', () => {
        let orderId: string;

        beforeEach(async () => {
            // Setup an order in PENDING state
            const cartRes = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testPhysicalProductId, quantity: 1 }] });
            orderId = cartRes.body.id;

            await request(httpServer).patch(`/orders/${orderId}/checkout`).set('Authorization', `Bearer ${customer1Token}`);
        });

        it('should enforce state machine constraints: prevent STAFF from making illegal transitions', async () => {
            // Order is currently PENDING. According to the business lifecycle, 
            // jumping directly to PAID or DELIVERED without being APPROVED is forbidden.
            const response = await request(httpServer)
                .patch(`/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: OrderStatus.PAID }) // Illegal state jump
                .expect(400); // Domain validator should block this transition

            expect(response.body.message).toBeDefined();
        });

        it('should successfully retrieve the negotiation timeline via GET /orders/:id/messages', async () => {
            // 1. Move to IN_NEGOTIATION to open the timeline
            await request(httpServer)
                .patch(`/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: OrderStatus.IN_NEGOTIATION });

            // 2. Post a message to the timeline
            await request(httpServer)
                .post(`/orders/${orderId}/messages`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ content: 'Testing the retrieval of audit logs.' });

            // 3. Fetch the messages
            const response = await request(httpServer)
                .get(`/orders/${orderId}/messages`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .expect(200);

            // 4. Validate the serialization and data
            const messages = response.body.data || response.body.items || response.body;
            expect(Array.isArray(messages)).toBe(true);
            expect(messages.length).toBeGreaterThan(0);

            // Validate that the exact message was saved and returned
            const savedMessage = messages.find((m: any) => m.content === 'Testing the retrieval of audit logs.');
            expect(savedMessage).toBeDefined();
            expect(savedMessage.senderId).toBeDefined(); // Ensures the sender relation or ID is exposed
        });
    });

    describe('RBAC & Staff Operations (Filters and Security)', () => {
        let pendingOrderId: string;
        let draftOrderId: string;

        beforeEach(async () => {
            // Setup: Create two orders with different statuses to test filtering

            // 1. Order in PENDING status
            const cart1 = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testPhysicalProductId, quantity: 1 }] });
            pendingOrderId = cart1.body.id;
            await request(httpServer).patch(`/orders/${pendingOrderId}/checkout`).set('Authorization', `Bearer ${customer1Token}`);

            // 2. Order in DRAFT status
            await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer2Token}`)
                .send({ items: [{ productId: testServiceProductId, quantity: 1 }] });
            // Remains as DRAFT
        });

        it('should enforce RBAC: completely block CUSTOMER from accessing STAFF endpoints', async () => {
            // Customer attempting to list all system orders
            const getRes = await request(httpServer)
                .get('/orders')
                .set('Authorization', `Bearer ${customer1Token}`)
                .expect(403); // Forbidden by @Roles() decorator
            expect(getRes.body.message).toBeDefined();

            // Customer attempting to forcefully change an order status
            const patchRes = await request(httpServer)
                .patch(`/orders/${pendingOrderId}/status`)
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ status: OrderStatus.APPROVED })
                .expect(403);
            expect(patchRes.body.message).toBeDefined();
        });

        it('should allow STAFF to fetch all orders and correctly apply status filters', async () => {
            // STAFF fetches ONLY orders with PENDING status
            const response = await request(httpServer)
                .get(`/orders?status=${OrderStatus.PENDING}`)
                .set('Authorization', `Bearer ${staffToken}`)
                .expect(200);

            const items = response.body.data || response.body.items || response.body;

            expect(Array.isArray(items)).toBe(true);
            expect(items.length).toBeGreaterThan(0);

            // Ensure no DRAFT or other statuses leaked into the response
            items.forEach((order: any) => {
                expect(order.status).toBe(OrderStatus.PENDING);
            });
        });
    });

    describe('Infrastructure: Pipe Validations & Boundaries', () => {
        it('should return 400 Bad Request if the ID parameter is not a valid UUID (ParseUUIDPipe)', async () => {
            await request(httpServer)
                .patch('/orders/invalid-uuid-format/checkout')
                .set('Authorization', `Bearer ${customer1Token}`)
                .expect(400);
        });

        it('should return 404 Not Found when a STAFF attempts to update a valid UUID that does not exist', async () => {
            const fakeUuid = '123e4567-e89b-12d3-a456-426614174000'; // Structurally valid, but absent

            await request(httpServer)
                .patch(`/orders/${fakeUuid}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: OrderStatus.APPROVED })
                .expect(404);
        });

        it('should enforce conditional validation: return 400 Bad Request if STAFF rejects an order without providing a rejectionReason', async () => {
            const fakeUuid = '123e4567-e89b-12d3-a456-426614174000'; // Valid UUID so ParseUUIDPipe passes

            const response = await request(httpServer)
                .patch(`/orders/${fakeUuid}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: OrderStatus.REJECTED }) // Missing the required rejectionReason
                .expect(400); // ValidationPipe must block this

            expect(JSON.stringify(response.body.message)).toContain('rejectionReason');
        });

        it('should enforce payload boundaries: block zero/negative quantities and empty arrays', async () => {
            // Test 1: Empty Array
            const emptyRes = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [] })
                .expect(400); // @ArrayNotEmpty() must block

            expect(JSON.stringify(emptyRes.body.message)).toContain('items');

            // Test 2: Negative Quantity
            const negativeRes = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testPhysicalProductId, quantity: -5 }] })
                .expect(400); // @Min(1) must block

            expect(JSON.stringify(negativeRes.body.message)).toContain('quantity');

            // Test 3: Zero Quantity
            const zeroRes = await request(httpServer)
                .post('/orders/cart')
                .set('Authorization', `Bearer ${customer1Token}`)
                .send({ items: [{ productId: testPhysicalProductId, quantity: 0 }] })
                .expect(400); // @Min(1) must block

            expect(JSON.stringify(zeroRes.body.message)).toContain('quantity');
        });
    });
});