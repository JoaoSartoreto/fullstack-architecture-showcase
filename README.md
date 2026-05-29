# Enterprise Ecosystem Showcase 🚀

This repository is a proof-of-concept enterprise system simulating a highly concurrent B2B/B2G operational flow. It features a distributed architecture with a Core API (NestJS), an asynchronous Log Service (Golang), and a RabbitMQ message broker.

For an in-depth look at domain boundaries, state machines, and technical decisions, please read our [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🛠️ Prerequisites

To run this ecosystem, you only need:
* **Docker**
* **Docker Compose**

## ⚙️ Environment Setup

Before starting the application, create a `.env` file in the `core-api/` directory (or export them to your environment). The system relies on the following configuration:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| **NODE_ENV** | `development` | Defines the execution environment. |
| **DB_HOST** | `postgres-core` | The internal Docker network hostname for the Core DB. |
| **DB_PORT** | `5432` | Postgres connection port. |
| **DB_USER** | `user_core` | Core database user. |
| **DB_PASS** | `password_core` | Core database password. |
| **DB_NAME** | `core_db` | Core database name. |
| **JWT_SECRET** | `super_secret_showcase...` | Secret key for JWT Bearer token generation. |
| **JWT_EXPIRATION** | `1h` | Time-to-live for authentication tokens. |
| **OUTBOX_POLLING_INTERVAL_MS** | `5000` | Frequency of the background relay worker. |
| **OUTBOX_MAX_RETRIES** | `3` | Max attempts to publish a failed event to RabbitMQ. |
| **ENABLE_DB_SEED** | `true` | If true, automatically provisions Admin users and Catalog items on boot. |

## 🚀 Running the Ecosystem

The entire infrastructure, including databases, brokers, and application services, is orchestrated via Docker Compose.

**1. Clone the repository and navigate to the root folder:**
```bash
git clone https://github.com/JoaoSartoreto/fullstack-architecture-showcase
cd fullstack-architecture-showcase

```

**2. Start the ecosystem in detached mode:**

```bash
docker-compose up -d --build

```

**3. Verify the logs (Optional):**

```bash
docker-compose logs -f core-api

```

## 🗺️ Services Overview

Once the containers are up and running, you can access the services through the following ports on your `localhost`:

| Service | Exposes | URL / Port |
| --- | --- | --- |
| **Core API (NestJS)** | Living Documentation (Swagger) | [http://localhost:3000/api-docs](http://localhost:3000/api-docs) |
| **Core API (NestJS)** | REST Endpoints | `http://localhost:3000` |
| **Log Service (Go)** | Internal Listener | `http://localhost:8080` |
| **RabbitMQ** | Management UI | [http://localhost:15672](http://localhost:15672) (guest/guest) |
| **Core Postgres** | Database Connection | `localhost:5432` |
| **Log Postgres** | Database Connection | `localhost:5433` |

## 🛑 Stopping the Ecosystem

To gracefully stop all containers and remove the default network, run:

```bash
docker-compose down

```

To also wipe the database volumes (resetting all data), append the `-v` flag: `docker-compose down -v`.
