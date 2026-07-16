# Core API (NestJS)

This is the primary backend application governing the business logic, state machines, and IAM boundaries of the ecosystem.

## ⚙️ Environment Setup

Before starting the application locally or via Docker, create a `.env` file in this `core-api/` directory. The system relies on the following configurations:

| Variable | Default Value | Description & Expected Format |
| :--- | :--- | :--- |
| **NODE_ENV** | `development` | **String**. Defines the execution context (e.g., `development`, `staging`, `production`). |
| **DB_HOST** | `postgres-core` | **String**. Internal Docker network hostname or remote IP address for the Core DB. |
| **DB_PORT** | `5432` | **Number**. The TCP port used to establish the PostgreSQL connection. |
| **DB_USER** | `user_core` | **String**. The master username for database authentication. |
| **DB_PASS** | `password_core` | **String**. The secure password for the database user. |
| **DB_NAME** | `core_db` | **String**. The specific database identifier/schema to connect to. |
| **JWT_SECRET** | `super_secret...` | **String**. A strong cryptographic key used to sign and verify JWT Bearer tokens. |
| **JWT_EXPIRATION** | `1h` | **String**. Time-to-live format (e.g., `1h` for 1 hour, `7d` for 7 days, `15m` for 15 minutes). |
| **RMQ_HOST** | `rabbitmq` | **String**. Internal Docker hostname or IP address for the RabbitMQ message broker. |
| **RMQ_PORT** | `5672` | **Number**. The TCP port for AMQP broker connections. |
| **RMQ_USER** | `guest` | **String**. Username for RabbitMQ cluster authentication. |
| **RMQ_PASS** | `guest` | **String**. Password for RabbitMQ cluster authentication. |
| **OUTBOX_BATCH_SIZE** | `50` | **Number**. Maximum integer of pending outbox events processed per single polling cycle. |
| **OUTBOX_RELAY_CRON** | `*/5 * * * * *` | **String**. Valid 6-field CRON expression for the relay scheduler. |
| **OUTBOX_SWEEP_CRON** | `0 3 * * *` | **String**. Valid 6-field CRON expression for the garbage collection routine. |
| **OUTBOX_RETENTION_DAYS**| `7` | **Number**. Amount of days to keep processed outbox logs before permanent deletion. |
| **OUTBOX_MAX_RETRIES** | `3` | **Number**. Max integer of publishing attempts to the broker before dropping the event. |
| **ENABLE_DB_SEED** | `true` | **Boolean**. If true, automatically provisions Admin users and Catalog items on boot. |

> **⏱️ Note on CRON Expressions** > The scheduling engine uses standard 6-field CRON syntax: `* * * * * *` (Seconds, Minutes, Hours, Day of Month, Months, Day of Week).
> * `*/5 * * * * *` translates to: Run strictly every 5 seconds.
> * `0 3 * * *` translates to: Run daily at exactly 03:00 AM.

## 🌱 Default Seed Data (Testing Credentials)

If the `ENABLE_DB_SEED` environment variable is set to `true`, the application automatically populates the database upon the first boot. You can use the following credentials to authenticate via the `/auth/login` endpoint:

| User Role | Email | Password | Full Name |
| --- | --- | --- | --- |
| **ADMIN** | `admin@teste.com` | `teste123` | Admin Test |
| **STAFF** | `staff@teste.com` | `teste123` | Staff Test |
| **CUSTOMER** | `customer@teste.com` | `teste123` | Customer Test |

## 🧪 Running Tests

This module maintains a strict testing pyramid separating pure logic from infrastructure validation.

### 1. Comprehensive Unit Suite
Tests domain services, utility parsers, and synchronous rules in strict isolation without booting the NestJS IoC container or database.
```bash
# Inside the container workspace or local environment:
npm run test
```

### 2. End-to-End (E2E) Verification
Validates infrastructure, RBAC security barriers, asynchronous Transactional Outbox workers, and state machine transitions using a singleton Docker test harness.
```bash
# Triggers the Jest E2E configuration and spins up the test infrastructure:
npm run test:e2e
```
