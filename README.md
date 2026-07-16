# Enterprise Ecosystem Showcase 🚀

This repository is a proof-of-concept enterprise system simulating a highly concurrent B2B/B2G operational flow. It features a distributed architecture with a Core API (NestJS), an asynchronous Transactional Outbox log relay worker, a RabbitMQ message broker, and a high-performance consumer microservice written in Go.

For an in-depth look at domain boundaries, state machines, and technical architectural decisions, please read our [ARCHITECTURE.md](./ARCHITECTURE.md).

## ✨ Key Features
* **Domain-Driven Design (DDD):** Strict separation of concerns handling complex B2B state machines (including Customer Autonomy and Smart Cart Upserts), bidirectional inventory control, and polymorphic catalog management.
* **Identity & Access Management (IAM):** Robust RBAC implementation guarding against privilege escalation, combined with global rate-limiting (Throttler) to mitigate brute-force and DDoS attacks.
* **100% Traceability:** Custom `AsyncLocalStorage` middleware and RxJS interceptors capture non-blocking telemetry and map actions to actor IDs.
* **Transactional Outbox Pattern:** Dual-write protection intercepting TypeORM persistence hooks to guarantee event publishing to RabbitMQ without distributed data loss.
* **Living Documentation:** Mapped Types and Compound Decorators ensuring absolute fidelity between runtime DTOs and the Swagger OpenAPI UI.

## 🛠️ Prerequisites

To run this ecosystem, you only need:
* **Docker**
* **Docker Compose**

## 🚀 Running the Ecosystem

The entire infrastructure, including databases, brokers, and application services, is orchestrated via Docker Compose.

**1. Clone the repository and navigate to the root folder:**
```bash
git clone https://github.com/JoaoSartoreto/fullstack-architecture-showcase
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
| **Core API (NestJS)** | Living Documentation (Swagger) | http://localhost:3000/api-docs |
| **Core API (NestJS)** | REST API Gateway | `http://localhost:3000` |
| **Log Service (Go)** | Internal Listener | `http://localhost:8080` |
| **RabbitMQ** | Management Console Dashboard | http://localhost:15672 (guest/guest) |
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

## 📚 Module Documentation
For specific setup variables, default database credentials, and testing commands, refer to the module-specific documentation:
* [Core API (NestJS) Documentation](./core-api/README.md)
* [Log Service (Go) Documentation](./log-service-go/README.md)
