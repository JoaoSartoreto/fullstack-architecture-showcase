import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { DbCleaner } from '../../helpers/db-cleaner';
import { TestHarness } from '../../helpers/test-harness';

describe('Authentication & Users (e2e)', () => {
    let app: INestApplication;
    let dbCleaner: DbCleaner;
    let httpServer: any;

    // The singleton TestHarness boots the heavy Docker infrastructure only once
    beforeAll(async () => {
        const harness = TestHarness.getInstance();
        app = await harness.start();
        httpServer = app.getHttpServer();

        const dataSource = app.get(DataSource);
        dbCleaner = new DbCleaner(dataSource);
    });

    // We clean the transactional tables between tests, but the Seeder data (Admin/Staff/Customer) survives
    afterEach(async () => {
        await dbCleaner.clear();
    });

    afterAll(async () => {
        const harness = TestHarness.getInstance();
        await harness.stop();
    });

    describe('Database Seeding & Default Credentials', () => {
        it('should successfully authenticate the seeded Admin user and return a JWT', async () => {
            const response = await request(httpServer)
                .post('/auth/login')
                .send({
                    email: 'admin@teste.com',
                    password: 'teste123',
                })
                .expect(200); // NestJS default for POST is 201 Created

            expect(response.body).toHaveProperty('access_token');
            expect(typeof response.body.access_token).toBe('string');
        });

        it('should successfully authenticate the seeded Staff user', async () => {
            const response = await request(httpServer)
                .post('/auth/login')
                .send({
                    email: 'staff@teste.com',
                    password: 'teste123',
                })
                .expect(200);

            expect(response.body).toHaveProperty('access_token');
        });

        it('should reject login with incorrect password and return 401 Unauthorized', async () => {
            await request(httpServer)
                .post('/auth/login')
                .send({
                    email: 'admin@teste.com',
                    password: 'wrongpassword!',
                })
                .expect(401);
        });
    });

    describe('User Registration (Public Endpoint)', () => {
        it('should register a new user as CUSTOMER by default', async () => {
            const newUser = {
                fullName: 'Integration Test User',
                email: 'integration@test.com',
                password: 'strongPassword123!',
            };

            const response = await request(httpServer)
                .post('/users')
                .send(newUser)
                .expect(201);

            expect(response.body.email).toBe(newUser.email);
            expect(response.body.role).toBe('CUSTOMER'); // Adjust string/enum based on your exact Role Enum
            expect(response.body).not.toHaveProperty('password'); // Password leaks defense
            expect(response.body).not.toHaveProperty('passwordHash');
        });

        it('should throw BadRequest (400) if validation pipe fails on registration', async () => {
            const invalidUser = {
                fullName: '', // Invalid empty name
                email: 'not-an-email', // Invalid email
                password: '123', // Password too short
            };

            const response = await request(httpServer)
                .post('/users')
                .send(invalidUser)
                .expect(400);

            // Our global ValidationPipe should kick in exactly like in production
            expect(response.body.message).toBeInstanceOf(Array);
        });

        it('should prevent registration with an already existing email', async () => {
            const duplicatedUser = {
                fullName: 'Copycat User',
                email: 'admin@teste.com', // Already exists from seed
                password: 'strongPassword123!',
            };

            const response = await request(httpServer)
                .post('/users')
                .send(duplicatedUser);

            // Typically APIs return 409 Conflict or 400 BadRequest for unique constraint violations.
            expect([400, 409]).toContain(response.status);
        });
    });

    describe('RBAC (Role-Based Access Control) Enforcement', () => {
        let customerToken: string;

        beforeEach(async () => {
            // Setup: Get a token for the seeded customer
            const loginRes = await request(httpServer)
                .post('/auth/login')
                .send({ email: 'customer@teste.com', password: 'teste123' })
                .expect(200);
            customerToken = loginRes.body.access_token;
        });

        it('should block a CUSTOMER from accessing STAFF routes (GET /users)', async () => {
            await request(httpServer)
                .get('/users')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(403); // Forbidden
        });
    });

    it('should allow an ADMIN to access STAFF routes (GET /users)', async () => {
        // First, authenticate as Admin
        const adminLogin = await request(httpServer)
            .post('/auth/login')
            .send({ email: 'admin@teste.com', password: 'teste123' })
            .expect(200);

        const adminToken = adminLogin.body.access_token;

        // Then, access the protected route
        const response = await request(httpServer)
            .get('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        // Verifica se os usuários vieram em uma propriedade "data", "items" ou se for um array direto.
        const usersList = response.body.data;

        expect(Array.isArray(usersList)).toBe(true);
        expect(usersList.length).toBeGreaterThan(0);
    });
});