import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { DbCleaner } from '../../helpers/db-cleaner';
import { TestHarness } from '../../helpers/test-harness';

describe('Catalog & Products Domain (e2e)', () => {
    let app: INestApplication;
    let dbCleaner: DbCleaner;
    let httpServer: any;

    let adminToken: string;
    let staffToken: string;
    let customerToken: string;

    beforeAll(async () => {
        const harness = TestHarness.getInstance();
        app = await harness.start();
        httpServer = app.getHttpServer();
        dbCleaner = new DbCleaner(app.get(DataSource));

        // 1. Authenticate as Admin
        const adminRes = await request(httpServer).post('/auth/login').send({ email: 'admin@teste.com', password: 'teste123' });
        adminToken = adminRes.body.access_token;

        // 2. Authenticate as Staff
        const staffRes = await request(httpServer).post('/auth/login').send({ email: 'staff@teste.com', password: 'teste123' });
        staffToken = staffRes.body.access_token;

        // 3. Authenticate as Customer
        const customerRes = await request(httpServer).post('/auth/login').send({ email: 'customer@teste.com', password: 'teste123' });
        customerToken = customerRes.body.access_token;
    });

    afterEach(async () => {
        await dbCleaner.clear();
    });

    afterAll(async () => {
        await TestHarness.getInstance().stop();
    });

    describe('Product Creation (POST /products)', () => {
        it('should block a CUSTOMER from creating a product (403)', async () => {
            await request(httpServer)
                .post('/products')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ name: 'Hacker Item', price: 10, type: 'PHYSICAL_GOODS', stockQuantity: 1 })
                .expect(403);
        });

        it('should allow STAFF to create a PHYSICAL_GOODS product', async () => {
            const payload = {
                name: 'PlayStation 5 Pro',
                description: 'Console for Dragon Ball',
                price: 4999.99,
                type: 'PHYSICAL_GOODS',
                stockQuantity: 50, // Required for physical goods
            };

            const response = await request(httpServer)
                .post('/products')
                .set('Authorization', `Bearer ${staffToken}`)
                .send(payload)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe(payload.name);
            expect(response.body.type).toBe('PHYSICAL_GOODS');
        });

        it('should allow STAFF to create a SERVICE product', async () => {
            const payload = {
                name: 'IT Consulting',
                price: 150.00,
                type: 'SERVICE',
                estimatedDurationHours: 2, // Required for services
            };

            await request(httpServer)
                .post('/products')
                .set('Authorization', `Bearer ${staffToken}`)
                .send(payload)
                .expect(201);
        });

        it('should enforce @ValidateIf: Reject PHYSICAL_GOODS without stockQuantity (400)', async () => {
            const payload = {
                name: 'Broken Item',
                price: 100,
                type: 'PHYSICAL_GOODS',
                // missing stockQuantity!
            };

            const response = await request(httpServer)
                .post('/products')
                .set('Authorization', `Bearer ${staffToken}`)
                .send(payload)
                .expect(400);

            expect(JSON.stringify(response.body.message)).toContain('stockQuantity');
        });

        it('should reject invalid constraints (e.g. negative price) (400)', async () => {
            const payload = {
                name: 'Free Money',
                price: -50, // Invalid @Min(0)
                type: 'SERVICE',
                estimatedDurationHours: 1
            };

            await request(httpServer)
                .post('/products')
                .set('Authorization', `Bearer ${staffToken}`)
                .send(payload)
                .expect(400);
        });
    });

    describe('Product Updates (PATCH /products/:id)', () => {
        let testProductId: string;

        beforeAll(async () => {
            // Create a throwaway product to be updated
            const res = await request(httpServer)
                .post('/products')
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ name: 'Old Name', price: 100, type: 'PHYSICAL_GOODS', stockQuantity: 10 })
                .expect(201);

            testProductId = res.body.id;
        });

        it('should block a CUSTOMER from updating a product (403)', async () => {
            await request(httpServer)
                .patch(`/products/${testProductId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ price: 50 })
                .expect(403);
        });

        it('should allow STAFF to update price and isActive status', async () => {
            const response = await request(httpServer)
                .patch(`/products/${testProductId}`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ price: 150, isActive: false })
                .expect(200);

            expect(Number(response.body.price)).toBe(150);
            expect(response.body.isActive).toBe(false);
        });

        it('should return 400 Bad Request if the ID parameter is not a valid UUID', async () => {
            await request(httpServer)
                .patch('/products/invalid-uuid-format')
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ price: 200 })
                .expect(400); // ParseUUIDPipe enforcement
        });

        it('should return 404 Not Found when trying to update a non-existent product', async () => {
            const fakeUuid = '123e4567-e89b-12d3-a456-426614174000'; // Valid UUID, but doesn't exist

            const response = await request(httpServer)
                .patch(`/products/${fakeUuid}`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ price: 200 })
                .expect(404);

            expect(response.body.message).toContain('not found');
        });
    });

    describe('Product Retrieval and Pagination (GET /products)', () => {
        it('should allow CUSTOMER to list available products with pagination metadata', async () => {
            const response = await request(httpServer)
                .get('/products')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('meta');
            expect(Array.isArray(response.body.data)).toBe(true);

            expect(response.body.meta).toHaveProperty('page');
            expect(response.body.meta).toHaveProperty('take');
            expect(response.body.meta).toHaveProperty('itemCount');
            expect(typeof response.body.meta.hasNextPage).toBe('boolean');
        });

        it('should apply pagination parameters (take=2)', async () => {
            const response = await request(httpServer)
                .get('/products?take=2&page=1')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body.meta.take).toBe(2);
            expect(response.body.data.length).toBeLessThanOrEqual(2);
        });

        it('should block CUSTOMER from accessing STAFF-only /products/all endpoint (403)', async () => {
            await request(httpServer)
                .get('/products/all')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(403);
        });

        it('should allow STAFF to access /products/all', async () => {
            const response = await request(httpServer)
                .get('/products/all')
                .set('Authorization', `Bearer ${staffToken}`)
                .expect(200);

            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    it('should correctly apply filtering pipelines (e.g., minPrice and type)', async () => {
        const response = await request(httpServer)
            .get('/products?minPrice=100&type=PHYSICAL_GOODS')
            .set('Authorization', `Bearer ${customerToken}`)
            .expect(200);

        // Even if the seeder has many items, the result must strictly obey the filters
        const items = response.body.data;
        expect(Array.isArray(items)).toBe(true);

        items.forEach(item => {
            expect(Number(item.price)).toBeGreaterThanOrEqual(100);
            expect(item.type).toBe('PHYSICAL_GOODS');
        });
    });
});