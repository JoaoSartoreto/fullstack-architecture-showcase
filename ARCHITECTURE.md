# Enterprise Ecosystem Showcase - Architecture & Roadmap

## 🎯 Project Vision
A proof-of-concept enterprise system simulating a B2B/B2G operational flow. The architecture is designed to handle high-concurrency requests, enforce strict RBAC (Role-Based Access Control), manage complex state machines for orders, and guarantee 100% traceability through an asynchronous microservices auditing system.

## 🏗️ Tech Stack
- **Core API:** NestJS, TypeScript, TypeORM, PostgreSQL.
- **Audit Microservice:** Go (Golang), PostgreSQL.
- **Message Broker:** RabbitMQ.
- **Infrastructure:** Docker Compose.

---

## ✅ Current State (Completed Domains)

### 1. Users & Authentication
- Implemented global `ValidationPipe` at the module level for strict DTO sanitization (Whitelist enforcement).
- Custom `@CurrentUser()` decorator mapping directly to JWT payload, eliminating IDOR vulnerabilities.
- Extensible RBAC implementation using Bitwise/Hierarchical logic (`CUSTOMER` -> `STAFF` -> `ADMIN`).
- Role promotion mechanism strictly confined to `ADMIN` authorization.

### 2. Catalog Domain (Inventory)
- Implemented **Single Table Inheritance (Polymorphism)** (`CatalogItem` as abstract base).
- Supported types: `PHYSICAL_GOODS` (enforces strict stock control) and `SERVICE` (enforces estimated duration without inventory tracking).
- Factory Pattern implementation for semantic entity creation.
- Extracted validation logic to dedicated Utility classes to respect the Single Responsibility Principle.

### 3. Orders Domain (The Core Engine)
- **State Machine:** Governs the immutable lifecycle of an order: `DRAFT` -> `PENDING` -> `IN_NEGOTIATION` -> `APPROVED` / `REJECTED` -> `DELIVERED`.
- **Shopping Cart (`DRAFT`):** Customers have full CRUD control over their draft items.
- **Checkout Process:** Freezes product prices chronologically to guarantee historical financial immutability regardless of future catalog changes.
- **Domain-Driven Design (DDD):** `OrdersService` acts purely as an orchestrator. Inventory deduction is strictly delegated to the `ProductsService` within an ACID Database Transaction to prevent race conditions and overselling.
- **Diffing Algorithm:** The `IN_NEGOTIATION` phase uses an $O(N+M)$ algorithmic approach utilizing JavaScript `Map` and `Set` structures to upsert, modify, or delete order lines without destroying the historical `createdAt` metadata.
- **Bidirectional Communication:** Implemented `OrderMessageEntity` to act as a timeline/chat for negotiation between Staff and Customers.
- **Read Decoupling:** Implemented anti-over-fetching architecture by splitting read endpoints: Lightweight tables for listing, nested payloads for details, and isolated fetches for chat history.

### 4. Testing Culture
- Comprehensive Unit Testing suite (Jest) covering business logic, domain boundaries, state transitions, and exception handling.
- Mocking structures strictly respect Transaction Managers (`EntityManager`) to validate ACID compliance.

---

## 🗺️ Endpoints Map

### Auth & Users
| Method | Endpoint | Role | Objective |
| :--- | :--- | :--- | :--- |
| **POST** | `/auth/login` | Public | Generates JWT Bearer token. |
| **POST** | `/users` | Public | Registers a new user account. |
| **GET** | `/users/me` | Authenticated | Returns the profile of the currently logged-in user. |
| **GET** | `/users` | `STAFF` | Lists all users in the system. |
| **PATCH** | `/users/:id/role` | `ADMIN` | Elevates or demotes user privileges. |

### Products (Catalog)
| Method | Endpoint | Role | Objective |
| :--- | :--- | :--- | :--- |
| **POST** | `/products` | `STAFF` | Creates a Polymorphic item (Goods or Services). |
| **GET** | `/products` | `CUSTOMER` | Returns only Active items (and goods with stock > 0). |
| **GET** | `/products/all` | `STAFF` | Returns the entire global catalog. |
| **PATCH** | `/products/:id` | `STAFF` | Updates metadata. Validates constraints via Utils. |

### Orders (State Machine & Chat)
| Method | Endpoint | Role | Objective |
| :--- | :--- | :--- | :--- |
| **POST** | `/orders/cart` | `CUSTOMER` | Creates a cart or pushes items into an existing DRAFT. |
| **DELETE**| `/orders/cart/items/:itemId` | `CUSTOMER` | Removes a specific item from the active cart. |
| **PATCH** | `/orders/:id/checkout` | `CUSTOMER` | Submits the draft, freezing prices and advancing state. |
| **PATCH** | `/orders/:id/items` | `STAFF` | Triggers the Diffing Algorithm to adjust order lines during negotiation. |
| **PATCH** | `/orders/:id/status` | `STAFF` | Advances the machine state. Triggers inventory deduction if APPROVED. |
| **POST** | `/orders/:id/messages` | `BOTH` | Appends a text node to the negotiation timeline. |
| **GET** | `/orders` | `STAFF` | Lightweight fetch. Lists all active system orders. |
| **GET** | `/orders/my-orders` | `CUSTOMER` | Lightweight fetch. Lists self-owned orders. |
| **GET** | `/orders/:id` | `BOTH` | Fetches the full envelope, items, and current products. |
| **GET** | `/orders/:id/messages` | `BOTH` | Fetches isolated, chronologically sorted chat history. |

---

## 🚀 Roadmap (What is missing)

### Phase 4: Infrastructure Polish (Current)
- [ ] **Database Seeding:** Build initialization scripts/endpoints to populate the database with an administrative user and a base catalog upon first boot.
- [ ] **Living Documentation:** Integrate `@nestjs/swagger` to auto-generate interactive API definitions, request/response schemas, and JWT testing capabilities.

### Phase 5: Distributed Auditing (The Microservices Layer)
- [ ] **Telemetry Interceptor:** Global NestJS interceptor to capture HTTP metadata and failures.
- [ ] **Transactional Outbox Pattern:** Implement the `outbox` table in the Core API to guarantee at-least-once delivery of domain events without distributed transaction locking.
- [ ] **NestJS Relay Worker:** Background cron job to poll the `outbox` table and publish payloads to RabbitMQ.
- [ ] **Go Microservice:** Develop the consumer in Go to ingest RabbitMQ events and persist them in an isolated Audit Database.

### Phase 6: E2E and Delivery
- [ ] End-to-End (E2E) testing suite utilizing Testcontainers.
- [ ] Implement generic Pagination decorators/DTOs (`take`, `skip`, `total`) to handle frontend infinite scrolling constraints.