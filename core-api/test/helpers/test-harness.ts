import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

export class TestHarness {
    private static instance: TestHarness | null = null;
    private postgresContainer!: StartedPostgreSqlContainer;
    private rabbitmqContainer!: StartedTestContainer;
    private app!: INestApplication;

    private constructor() { }

    public static getInstance(): TestHarness {
        if (!TestHarness.instance) {
            TestHarness.instance = new TestHarness();
        }
        return TestHarness.instance;
    }

    /**
     * Orchestrates the complete boot sequence for the ephemeral testing environment.
     */
    public async start(): Promise<INestApplication> {
        await this.provisionInfrastructure();
        this.injectEnvironmentVariables();
        await this.bootstrapNestApplication();
        await this.initializeDatabaseSchema();

        return this.app;
    }

    public getApp(): INestApplication {
        if (!this.app) {
            throw new Error('TestHarness context has not been started yet.');
        }
        return this.app;
    }

    /**
     * Orchestrates the graceful shutdown sequence for the application and containers.
     */
    public async stop(): Promise<void> {
        await this.teardownApplication();
        await this.teardownInfrastructure();
        TestHarness.instance = null;
    }

    // ----------------------------------------------------------------------
    // PRIVATE DOMAIN: Single Responsibility Methods
    // ----------------------------------------------------------------------

    private async provisionInfrastructure(): Promise<void> {
        this.postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
            .withDatabase('core_db_test')
            .withUsername('user_test')
            .withPassword('password_test')
            .start();

        this.rabbitmqContainer = await new GenericContainer('rabbitmq:3-management-alpine')
            .withExposedPorts(5672)
            .start();
    }

    private injectEnvironmentVariables(): void {
        process.env.NODE_ENV = 'test';

        // Database injection
        process.env.DB_HOST = this.postgresContainer.getHost();
        process.env.DB_PORT = this.postgresContainer.getMappedPort(5432).toString();
        process.env.DB_USER = 'user_test';
        process.env.DB_PASS = 'password_test';
        process.env.DB_NAME = 'core_db_test';

        // RabbitMQ injection
        process.env.RMQ_HOST = this.rabbitmqContainer.getHost();
        process.env.RMQ_PORT = this.rabbitmqContainer.getMappedPort(5672).toString();
        process.env.RMQ_USER = 'guest';
        process.env.RMQ_PASS = 'guest';

        // Security & Seeding injection
        process.env.JWT_SECRET = 'e2e_testing_secret_key_signature_proof';
        process.env.JWT_EXPIRATION = '1h';
        process.env.ENABLE_DB_SEED = 'true';
    }

    private async bootstrapNestApplication(): Promise<void> {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        this.app = moduleFixture.createNestApplication();

        await this.app.init();
    }

    private async initializeDatabaseSchema(): Promise<void> {
        const dataSource = this.app.get(DataSource);
        await dataSource.synchronize();
    }

    private async teardownApplication(): Promise<void> {
        if (this.app) {
            await this.app.close();
        }
    }

    private async teardownInfrastructure(): Promise<void> {
        if (this.postgresContainer) {
            await this.postgresContainer.stop();
        }
        if (this.rabbitmqContainer) {
            await this.rabbitmqContainer.stop();
        }
    }
}