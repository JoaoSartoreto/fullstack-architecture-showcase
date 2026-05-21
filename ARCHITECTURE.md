# Enterprise Ecosystem Showcase - Architecture & Roadmap

## 🎯 Project Vision
A proof-of-concept enterprise system simulating a B2B/B2G operational flow. The architecture is designed to handle high-concurrency requests, enforce strict RBAC (Role-Based Access Control), manage complex state machines for orders, and guarantee 100% traceability through an asynchronous microservices auditing system.

## 🏗️ Tech Stack
- **Core API:** NestJS, TypeScript, TypeORM, PostgreSQL.
- **Audit Microservice:** Go (Golang), PostgreSQL.
- **Message Broker:** RabbitMQ.
- **Infrastructure:** Docker Compose.

---

## ✅ Current State (What is done)

### 1. Users & Authentication (`UsersModule`, `AuthModule`)
- Implemented global `ValidationPipe` for DTOs.
- Custom `@CurrentUser()` decorator to prevent IDOR vulnerabilities.
- JWT-based authentication.
- Extensible RBAC implementation using Bitwise/Hierarchical logic (`CUSTOMER` -> `STAFF` -> `ADMIN`).
- Role promotion mechanism restricted to `ADMIN`.

### 2. Catalog Domain (`ProductsModule`)
- Implemented **Single Table Inheritance (Polymorphism)** using TypeORM (`CatalogItem` as abstract base).
- Supported types: `PHYSICAL_GOODS` (stock control) and `SERVICE` (estimated duration).
- Factory Pattern implementation for semantic and scalable entity creation/validation (`catalog.factory.ts`).
- Secure Catalog endpoints (Customers see available/active items; Staff manages inventory).

### 3. Testing Culture
- Postman abandoned for logic testing.
- Comprehensive Unit Testing suite (Jest) covering business logic and boundary conditions for Services and Guards.
- Controllers excluded from unit tests (delegated to E2E phase).

---

## 🚀 Roadmap (What is missing)

### Phase 1: Complex Orders Ecosystem
- [ ] Create `OrderEntity` (Header) and `OrderItemEntity` (Lines) keeping historical price immutability.
- [ ] Implement robust State Machine: `PENDING` -> `IN_NEGOTIATION` -> `APPROVED` / `REJECTED` / `DELIVERED`.
- [ ] Implement `OrderMessageEntity` to act as a timeline/chat for negotiation between Staff and Customers (e.g., partial fulfillment of out-of-stock items).
- [ ] Establish strict FIFO (First In, First Out) sorting for backend order fulfillment to mitigate race conditions unfairly benefiting later requests.

### Phase 2: Distributed Auditing (The Microservices Layer)
- [ ] **Telemetry Interceptor:** Global NestJS interceptor to capture HTTP metadata and failures, pushing them to RabbitMQ.
- [ ] **Transactional Outbox Pattern:** Implement the `outbox` table in the Core API. State changes (like order approval) must write to this table within the same DB transaction.
- [ ] **NestJS Relay Worker:** Background cron/worker to pool the `outbox` table and publish to RabbitMQ reliably.
- [ ] **Go Microservice:** Develop the consumer in Go to ingest RabbitMQ events and persist them in an isolated Audit Database.

### Phase 3: Final Polish
- [ ] End-to-End (E2E) testing suite utilizing Testcontainers or a dedicated test DB schema.
- [ ] Implement generic Pagination decorators/DTOs (Deferred to frontend integration phase).