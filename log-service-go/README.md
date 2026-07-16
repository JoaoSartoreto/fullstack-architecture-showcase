# Audit & Telemetry Service (Go Consumer)

This is the high-performance, asynchronous log consumer microservice. Written in Go, it is designed to ingest thousands of telemetry and audit events per second from RabbitMQ and persist them efficiently into a strictly isolated PostgreSQL database.

For payload formatting, JSONB schemas, and database indexing strategies, refer strictly to the [Integration Contracts (CONTRACTS.md)](./CONTRACTS.md).

## 🛠️ Prerequisites
* **Go 1.21+** (If running natively outside of Docker)
* **RabbitMQ & PostgreSQL** (Usually provided by the root `docker-compose.yml`)

## ⚙️ Environment Variables

When running locally without Docker Compose, create a `.env` file in this directory with the following variables (matching the Docker ecosystem configuration):

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| **DB_HOST** | `localhost` | The hostname for the isolated Log DB. |
| **DB_PORT** | `5433` | The exposed port for the Log DB. |
| **DB_USER** | `user_log` | Database authentication username. |
| **DB_PASS** | `password_log` | Database authentication password. |
| **DB_NAME** | `log_db` | The specific database schema to connect to. |
| **RMQ_HOST** | `localhost` | The RabbitMQ broker hostname. |
| **RMQ_PORT** | `5672` | The RabbitMQ AMQP port. |
| **RMQ_USER** | `guest` | RabbitMQ authentication username. |
| **RMQ_PASS** | `guest` | RabbitMQ authentication password. |

## 🚀 Running the Service Locally

If the root infrastructure (RabbitMQ and Postgres) is already running via Docker Compose, you can boot this consumer natively on your machine:

```bash
# Ensures all dependencies match the go.mod file
go mod tidy

# Starts the application
go run main.go

```

## 🧪 Testing Pipeline

The Go microservice separates domain logic testing from integration testing.

### 1. Automated Unit Pipeline

Executes isolated tests for the service layer, validation routines, and internal data transformations without requiring a live database or broker.

```bash
go test -v ./internal/service/...

```

### 2. Standalone Pipeline E2E Simulation

To verify the asynchronous pipeline integration independently (`RabbitMQ` -> `Go Netpoller` -> `PostgreSQL`), ensure the core Docker containers are up and execute the mock injector client. This tool floods the queue with mock payloads to test consumer resilience.

```bash
go run cmd/tester/main.go

```

*Note: A successful simulation prints a structured UUIDv7 Trace ID. You can query the `audit_logs` table inside the targeted `log_db` instance to inspect the successfully processed transaction.*
