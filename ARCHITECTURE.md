# Enterprise Ecosystem Showcase - Architecture & Roadmap

## 🎯 Project Vision
A proof-of-concept enterprise system simulating a highly concurrent B2B/B2G operational flow. The architecture is designed to enforce strict RBAC (Role-Based Access Control), manage complex state machines for orders, and guarantee 100% transactional traceability across microservices through an asynchronous Distributed Auditing pipeline without blocking primary write operations.

## 🏗️ Tech Stack
- **Core API:** NestJS, TypeScript, TypeORM, PostgreSQL.
- **Audit Microservice:** Go (Golang), PostgreSQL.
- **Message Broker:** RabbitMQ.
- **Infrastructure:** Docker Compose.

---

## ✅ Current State (Completed Domains & Infrastructure)

### 1. Infrastructure & Living Documentation
- **Idempotent Database Seeding:** Automated, environment-protected initialization scripts (`SeedModule`) that populate core users and a polymorphic catalog upon first boot, using highly optimized $O(1)$ SQL `EXISTS` lookups to prevent hydration overhead.
- **Living Documentation (OpenAPI/Swagger):** Fully integrated Swagger UI accessible at `/api-docs`.
  - Implemented via Nest CLI Plugin for automated static analysis of DTOs.
  - Utilized **Compound Decorators** to encapsulate verbose documentation rules, keeping Controllers strictly focused on routing logic.
  - Applied **Mapped Types** (`OmitType`, `PickType`) to ensure strict fidelity between Runtime TypeORM relations and Static Swagger JSON examples, preventing data leaks.

### 2. Users & Authentication
- Implemented global `ValidationPipe` at the module level for strict DTO sanitization (Whitelist enforcement).
- Custom `@CurrentUser()` decorator mapping directly to JWT payload, eliminating IDOR vulnerabilities.
- Extensible RBAC implementation using Bitwise/Hierarchical logic (`CUSTOMER` -> `STAFF` -> `ADMIN`).
- Role promotion mechanism strictly confined to `ADMIN` authorization.

### 3. Catalog Domain (Inventory)
- Implemented **Single Table Inheritance (Polymorphism)** (`CatalogItem` as abstract base).
- Supported types: `PHYSICAL_GOODS` (enforces strict stock control) and `SERVICE` (enforces estimated duration without inventory tracking).
- Factory Pattern implementation for semantic entity creation.
- Extracted validation logic to dedicated Utility classes to respect the Single Responsibility Principle.

### 4. Orders Domain (The Core Engine)
- **State Machine:** Governs the immutable lifecycle of an order: `DRAFT` -> `PENDING` -> `IN_NEGOTIATION` -> `APPROVED` / `REJECTED` -> `DELIVERED`.
- **Shopping Cart (`DRAFT`):** Customers have full CRUD control over their draft items.
- **Checkout Process:** Freezes product prices chronologically to guarantee historical financial immutability regardless of future catalog changes.
- **Domain-Driven Design (DDD):** `OrdersService` acts purely as an orchestrator. Inventory deduction is strictly delegated to the `ProductsService` within an ACID Database Transaction to prevent race conditions and overselling.
- **Diffing Algorithm:** The `IN_NEGOTIATION` phase uses an $O(N+M)$ algorithmic approach utilizing JavaScript `Map` and `Set` structures to upsert, modify, or delete order lines without destroying the historical `createdAt` metadata.
- **Bidirectional Communication:** Implemented `OrderMessageEntity` to act as a timeline/chat for negotiation between Staff and Customers.

### 5. Asynchronous Auditing & Distributed Traceability (The Outbox Core)
- **Distributed Traceability Middleware:** Implemented a low-level HTTP Middleware capturing incoming `X-Trace-Id` headers or natively generating highly collatable IDs (UUIDv7 sequence simulations). The execution flow is bound using `AsyncLocalStorage` (`RequestContext`), isolating thread-like telemetry states without modifying service method signatures.
- **Audit-Aware JWT Validation:** Extensively customized `JwtStrategy` to intercept the authentication handshake, query the database database for identity presence, and automatically inject the authenticated user (`actorId`) into the active tracing context.
- **Transactional Outbox Pattern (Dual-Write Protection):** Implemented a native TypeORM `OutboxSubscriber` that intercepts database lifecycle persistence hooks (`INSERT`/`UPDATE`). It serializes state alterations (`before`/`after` snapshots) and persists them into the `outbox_events` table using the *exact same ACID database transaction* as the primary business domain entity. This structurally prevents message-broker down-time from causing distributed data loss or desynchronization.
- **Dynamic Cron Engine (The Relay Worker):** Engineered a highly resilient background daemon (`OutboxScheduler`) that consumes the event queue. It registers programmatically decoupled Cron Jobs (`outboxRelayJob` and `outboxSweepJob`) via NestJS `SchedulerRegistry`.
  - **Relay Job:** Polls pending events, batches deliveries, publishes safely to RabbitMQ using transactional confirmations, and flags events as processed.
  - **Sweep Job (Garbage Collection):** Automatically cleans historically processed outbox logs older than the defined retention threshold to prevent database table bloat.
- **Unified Telemetry Ingestion:**
  - **AuditInterceptor:** Leverages RxJS pipeline streams (`tap`) to intercept non-exceptional HTTP workflows, extracting low-overhead telemetry (path, method, payload size, status code, and latency calculation).
  - **AllExceptionsFilter & ExceptionParser:** Formats and sanitizes application exceptions globally. It dispatches a robust, deep technical stack trace and metadata payload to the internal logging pipeline while returning a clean, scrubbed contract JSON response to external customers, preventing infrastructure data leaks.

### 6. Clean Architecture Log Microservice (Go Consumer)
- **Fully Decoupled Layers:** Structured with strict decoupling (Broker, Consumer, Service, Repository) ensuring the business logic is completely oblivious to the underlying transport and storage mechanisms.
- **High-Performance Ingestion:** Utilizes RabbitMQ multiplexed channels and Go's native `epoll`-based Netpoller to process telemetry events asynchronously with near-zero CPU idle waste.
- **Index Optimization:** Implemented **Partial B-Tree Expression Indexes** in PostgreSQL to maintain lightning-fast write throughput while keeping high-cardinality JSON payload fields searchable without generalized index bloat.
- **Docker Multi-stage Build:** Compiled via an ephemeral builder image and deployed on a pristine, vulnerability-free Alpine runtime, achieving a minimal attack surface and sub-10MB footprint.
- **Container Orchestration:** Configured stringent Docker Compose `healthchecks` to prevent Race Conditions, guaranteeing the Go binary only boots when the database and broker are strictly ready for connections.

### 7. Testing Culture & Quality Gates
- **100% Core Unit Test Coverage:** Comprehensive test suite written in Jest ensuring mathematical accuracy and structural integrity across all critical areas:
  - Complex state machines and diffing algorithms.
  - Interceptors, Global Exception Filters, and custom Typings.
  - TypeORM Transactional Subscribers, Schedulers, and Context storage blocks.
- **Test Strategy Decoupling:** Purposely separated transport testing from unit metrics by mocking the NestJS underlying dependencies, enforcing rapid, memory-efficient assertions.

---

## 🗺️ Endpoints Map
> **Note:** For interactive request/response schemas and JWT authentication, run the server and visit `/api-docs`.

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
| **PATCH** | `/orders/:id/items` | `STAFF` | Triggers the Diffing Algorithm to adjust order lines. |
| **PATCH** | `/orders/:id/status` | `STAFF` | Advances the machine state. Triggers inventory deduction if APPROVED. |
| **POST** | `/orders/:id/messages` | `BOTH` | Appends a text node to the negotiation timeline. |
| **GET** | `/orders` | `STAFF` | Lightweight fetch. Lists all active system orders. |
| **GET** | `/orders/my-orders` | `CUSTOMER` | Lightweight fetch. Lists self-owned orders. |
| **GET** | `/orders/:id` | `BOTH` | Fetches the full envelope, items, and current products. |
| **GET** | `/orders/:id/messages` | `BOTH` | Fetches isolated, chronologically sorted chat history. |

---

## 🚀 Roadmap (What is missing)

### Phase 6: End-to-End & Integration Testing
- [ ] **E2E Test Harness:** Setup a full containerized integration testing environment utilizing Testcontainers to simulate real HTTP requests and message publishing workflows.
- [ ] **Idempotent API Contract Testing:** Validate JSON contracts against the Go Microservice and database states under high concurrency simulation.

### Phase 7: API Usability Optimization
- [ ] **Generic Pagination Architecture:** Implement reusable global pagination interceptors/decorators mapping `take`, `skip`, and `total` to support front-end infinite scrolling constraints.