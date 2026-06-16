# Enterprise Ecosystem Showcase 🚀

This repository is a proof-of-concept enterprise system simulating a highly concurrent B2B/B2G operational flow. It features a distributed architecture with a Core API (NestJS), an asynchronous Transactional Outbox log relay worker, a RabbitMQ message broker, and a high-performance consumer microservice written in Go.

For an in-depth look at domain boundaries, state machines, and technical architectural decisions, please read our [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🛠️ Prerequisites

To run this ecosystem, you only need:
* **Docker**
* **Docker Compose**

## ⚙️ Environment Setup

Before starting the application, create a `.env` file in the `core-api/` directory. The system relies on the following configurations to orchestrate its behavior:

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
| **OUTBOX_RELAY_CRON** | `*/5 * * * * *` | **String**. Valid 6-field CRON expression for the relay scheduler. *(See Note below)* |
| **OUTBOX_SWEEP_CRON** | `0 3 * * *` | **String**. Valid 6-field CRON expression for the garbage collection routine. *(See Note below)* |
| **OUTBOX_RETENTION_DAYS**| `7` | **Number**. Amount of days to keep processed outbox logs before permanent deletion. |
| **OUTBOX_MAX_RETRIES** | `3` | **Number**. Max integer of publishing attempts to the broker before dropping the event. |
| **ENABLE_DB_SEED** | `true` | **Boolean** (`true`/`false`). If true, automatically provisions Admin users and Catalog items on boot. |

> **⏱️ Note on CRON Expressions** > The scheduling engine uses standard 6-field CRON syntax: `* * * * * *` (Seconds, Minutes, Hours, Day of Month, Months, Day of Week).
> * `*/5 * * * * *` translates to: Run strictly every 5 seconds.
> * `0 3 * * *` translates to: Run daily at exactly 03:00 AM.

## 🚀 Running the Ecosystem

The entire infrastructure, including databases, brokers, and application services, is orchestrated via Docker Compose.

**1. Clone the repository and navigate to the root folder:**
```bash
git clone [https://github.com/JoaoSartoreto/fullstack-architecture-showcase](https://github.com/JoaoSartoreto/fullstack-architecture-showcase)
cd fullstack-architecture-showcase

```

**2. Start the ecosystem in detached mode:**

```bash
docker compose up -d --build

```

**3. Verify application bootstrap logs:**

```bash
docker compose logs -f core-api

```

## 🗺️ Services Overview

Once the containers are operational, you can access the environment layout via `localhost`:

| Service | Exposes | URL / Port |
| --- | --- | --- |
| **Core API (NestJS)** | Living Documentation (Swagger) | [http://localhost:3000/api-docs](http://localhost:3000/api-docs) |
| **Core API (NestJS)** | REST API Gateway | `http://localhost:3000` |
| **Log Service (Go)** | Internal Listener | `http://localhost:8080` |
| **RabbitMQ** | Management Console Dashboard | [http://localhost:15672](http://localhost:15672) (guest/guest) |
| **Core Postgres** | Engine Primary Database | `localhost:5432` |
| **Log Postgres** | Audit Storage Isolated Database | `localhost:5433` |

## 🛑 Stopping the Ecosystem

To gracefully stop all containers and clear the virtual network layers, run:

```bash
docker compose down

```

To wipe the persistent storage database volumes completely (resetting state back to pristine seeding configuration), run:

```bash
docker compose down -v

```

## 🧪 Running Tests

### Core API (NestJS) — Comprehensive Unit Suite

The NestJS architecture isolates transport boundaries from business structures. Run the unit test suite inside the container workspace to assert 100% coverage on core rules:

```bash
docker compose exec core-api npm run test

```

### Log Service (Go) — Automated Unit Pipeline

To trigger the isolated service layer testing pipeline within the Go microservice environment:

```bash
cd log-service-go
go test -v ./internal/service/...

```

### Log Service (Go) — Standalone Pipeline E2E Simulation

To verify the async pipeline integration independently (`RabbitMQ` -> `Go Netpoller` -> `PostgreSQL`), ensure the core containers are up and execute the mock injector client:

```bash
cd log-service-go
go run cmd/tester/main.go

```

*Note: A successful simulation prints a structured UUIDv7 Trace ID. You can query the `audit_logs` table inside the targeted `log_db` instance to inspect the processed transaction.*
