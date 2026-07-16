import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { DbCleaner } from '../../helpers/db-cleaner';
import { TestHarness } from '../../helpers/test-harness';

describe('IAM - Identity & Access Management (e2e)', () => {
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

        it('should return 400 Bad Request if the email format is invalid', async () => {
            const invalidEmailUser = {
                fullName: 'Bad Email',
                email: 'not-an-email-format', // Fails @IsEmail()
                password: 'password123!',
            };

            const response = await request(httpServer)
                .post('/users')
                .send(invalidEmailUser)
                .expect(400);

            // Ensure the error message specifically mentions the email field
            expect(JSON.stringify(response.body.message)).toContain('email');
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

        it('should correctly apply filtering pipelines for users (e.g., filtering by role)', async () => {
            // 1. Authenticate as Admin to get the token in this scope
            const adminLogin = await request(httpServer)
                .post('/auth/login')
                .send({ email: 'admin@teste.com', password: 'teste123' })
                .expect(200);
            const adminToken = adminLogin.body.access_token;

            // 2. Perform the test
            const response = await request(httpServer)
                .get('/users?role=STAFF')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const usersList = response.body.data || response.body.items || response.body;

            expect(Array.isArray(usersList)).toBe(true);
            expect(usersList.length).toBeGreaterThan(0);

            // Strictly assert that every returned user actually has the STAFF role
            usersList.forEach((user: any) => {
                expect(user.role).toBe('STAFF');
            });
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

    describe('User Profile (GET /users/me)', () => {
        let customerToken: string;

        beforeAll(async () => {
            const loginRes = await request(httpServer)
                .post('/auth/login')
                .send({ email: 'customer@teste.com', password: 'teste123' })
                .expect(200);
            customerToken = loginRes.body.access_token;
        });

        it('should return the profile of the authenticated user', async () => {
            const response = await request(httpServer)
                .get('/users/me')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id');
            expect(response.body.email).toBe('customer@teste.com');
            expect(response.body.role).toBe('CUSTOMER');
            // Check if DTO exclusions are working (password should NEVER be returned)
            expect(response.body).not.toHaveProperty('password');
        });

        it('should reject unauthenticated requests with 401 Unauthorized', async () => {
            await request(httpServer)
                .get('/users/me')
                .expect(401); // JwtAuthGuard kicks in
        });
    });

    describe('Update Profile (PATCH /users/me)', () => {
        let testUserToken: string;

        beforeAll(async () => {
            // Register a temporary user just for update tests to keep the seeder data pristine
            const registerRes = await request(httpServer)
                .post('/users')
                .send({ fullName: 'Update Test', email: 'update@test.com', password: 'password123' })
                .expect(201);

            const loginRes = await request(httpServer)
                .post('/auth/login')
                .send({ email: 'update@test.com', password: 'password123' })
                .expect(200);

            testUserToken = loginRes.body.access_token;
        });

        it('should successfully update the user fullName', async () => {
            const response = await request(httpServer)
                .patch('/users/me')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ fullName: 'Updated Name' })
                .expect(200);

            // Verifies the return object reflects the update
            expect(response.body.fullName).toBe('Updated Name');
        });

        it('should reject password update if it does not meet minLength of 6 (400)', async () => {
            const response = await request(httpServer)
                .patch('/users/me')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ password: '123' }) // Too short based on UpdateUserDto
                .expect(400);

            expect(response.body.message).toBeInstanceOf(Array); // ValidationPipe error list
        });
    });

    describe('Role Management (PATCH /users/:id/role)', () => {
        let adminToken: string;
        let staffToken: string;
        let targetUserId: string;

        beforeAll(async () => {
            // 1. Get Admin Token
            const adminLogin = await request(httpServer)
                .post('/auth/login')
                .send({ email: 'admin@teste.com', password: 'teste123' })
                .expect(200);
            adminToken = adminLogin.body.access_token;

            // 2. Get Staff Token
            const staffLogin = await request(httpServer)
                .post('/auth/login')
                .send({ email: 'staff@teste.com', password: 'teste123' })
                .expect(200);
            staffToken = staffLogin.body.access_token;

            // 3. Register a throwaway user to be our test subject
            const registerRes = await request(httpServer)
                .post('/users')
                .send({ fullName: 'Role Test Subject', email: 'subject@test.com', password: 'password123' })
                .expect(201);

            // 4. Retrieve the ID of the new user by logging them in and calling /users/me
            const subjectLogin = await request(httpServer)
                .post('/auth/login')
                .send({ email: 'subject@test.com', password: 'password123' })
                .expect(200);

            const profileRes = await request(httpServer)
                .get('/users/me')
                .set('Authorization', `Bearer ${subjectLogin.body.access_token}`)
                .expect(200);

            targetUserId = profileRes.body.id;
        });

        it('should block a STAFF user from updating roles (403 Forbidden)', async () => {
            await request(httpServer)
                .patch(`/users/${targetUserId}/role`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ role: 'STAFF' })
                .expect(403); // RolesGuard enforcement
        });

        it('should reject invalid roles based on Enum validation (400)', async () => {
            await request(httpServer)
                .patch(`/users/${targetUserId}/role`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'HACKER_ROLE' }) // Not in Role Enum
                .expect(400); // ValidationPipe kicks in
        });

        it('should allow an ADMIN to update a user role', async () => {
            const response = await request(httpServer)
                .patch(`/users/${targetUserId}/role`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'STAFF' })
                .expect(200);

            expect(response.body.role).toBe('STAFF');
        });

        it('should return 400 Bad Request if the ID parameter is not a valid UUID', async () => {
            await request(httpServer)
                .patch('/users/invalid-uuid-format/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'STAFF' })
                .expect(400); // ParseUUIDPipe kicks in before the controller logic
        });

        it('should return 404 Not Found when trying to update the role of a non-existent user', async () => {
            const fakeUuid = '123e4567-e89b-12d3-a456-426614174000'; // Structurally valid, but doesn't exist

            const response = await request(httpServer)
                .patch(`/users/${fakeUuid}/role`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'STAFF' })
                .expect(404);

            expect(response.body.message).toBeDefined();
        });
    });
});