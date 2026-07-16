# 🧪 E2E Test Strategy & Validation Matrix

This document outlines the strategic approach for the End-to-End (E2E) testing suite of the `core-api`. Rather than attempting mathematically impossible 100% permutation coverage, this suite targets **Maximum Risk Coverage**, focusing on business boundaries, Role-Based Access Control (RBAC), and asynchronous infrastructure resilience.

## 1. Identity & Access Management (IAM)
The IAM suite validates authentication workflows and strictly guards against Privilege Escalation.

* **Sign-up & Validation:** Ensures users are created strictly as `CUSTOMER` by default. Validates payload formats resulting in `400 Bad Request`.
* **RBAC Enforcement:** Proves that a `CUSTOMER` receives a `403 Forbidden` when attempting to access `STAFF` routes (e.g., fetching user lists).
* **Privilege Escalation Defense:** Ensures that `PATCH /users/:id/role` is exclusively accessible by `ADMIN` users, blocking `STAFF` or `CUSTOMER` from elevating their own or others' roles.

## 2. Infrastructure & Security
This suite validates the non-functional requirements and background processes that keep the system resilient under load.

* **Transactional Outbox Worker:** Validates the background processor. Proves that the system fetches `PENDING` events, successfully dispatches them to the RabbitMQ broker, and atomically updates the database status to `PROCESSED`.
* **Garbage Collection (Sweep):** Ensures that processed outbox events older than the configured retention period (e.g., 7 days) are permanently deleted from the database to prevent table bloat.
* **Rate Limiting (Throttler):** Simulates a volumetric spam attack (brute-force simulation) against lightweight endpoints to verify that the application successfully shields itself by returning `429 Too Many Requests`, protecting the database connection pools.

## 3. Orders Domain (State Machine Validation)

The `Orders` domain is governed by a strict state machine. The E2E tests ensure that state transitions are enforced based on the actor's role and current status.

### 🗺️ Validation Matrix: Endpoint vs. State vs. Actor

| Endpoint | Actor | Initial State | Expected Final State | Critical Associated Rule |
| :--- | :--- | :--- | :--- | :--- |
| `POST /orders/cart` | `CUSTOMER` | None or `DRAFT` | `DRAFT` | **BR-07** (Smart upsert, prevents orphaned carts) |
| `DELETE /orders/cart/items/:itemId`| `CUSTOMER` | `DRAFT` | `DRAFT` | **BR-12** (Cannot remove items from other users' carts) |
| `PATCH /orders/:id/checkout` | `CUSTOMER` | `DRAFT` | `PENDING` | **BR-05** (Price freezing) and **BR-08** (Empty cart barrier) |
| `PATCH /orders/:id/items` | `STAFF` | `IN_NEGOTIATION`| `IN_NEGOTIATION` | **BR-06** (Alters volumes, but strictly prohibits unit price changes) |
| `POST /orders/:id/messages` | `BOTH` | `IN_NEGOTIATION`| `IN_NEGOTIATION` | **BR-09** (Timeline closed exclusively for this status) |
| `PATCH /orders/:id/approve` | `CUSTOMER` | `IN_NEGOTIATION`| `APPROVED` | **BR-10** (Customer autonomy) and **BR-03** (Strict stock lock) |
| `PATCH /orders/:id/cancel` | `CUSTOMER` | `PENDING` or `IN_NEGOTIATION`| `REJECTED` | **BR-11** (Pre-approval cancellation rights) |
| `PATCH /orders/:id/status` | `STAFF` | `PENDING` / `IN_NEGOTIATION`| `APPROVED` | **BR-03** (Stock deduction) and **BR-02** (Fulfillment notes required) |
| `PATCH /orders/:id/status` | `STAFF` | `PENDING` / `IN_NEGOTIATION`| `REJECTED` | Direct commercial rejection transition |
| `PATCH /orders/:id/status` | `STAFF` | `APPROVED` | `PAID` | Financial ledger lock |
| `PATCH /orders/:id/status` | `STAFF` | `APPROVED` | `REJECTED` | **BR-04** (Automatic and instant stock restoration) |
| `PATCH /orders/:id/status` | `STAFF` | `PAID` | `DELIVERED` | Successful terminal state |

### 🔍 Critical Behaviors Tested

1. **The Asymmetry of `CUSTOMER` Cancellation (`BR-11` vs. Transition Graph):**
   Ensures that cancellation via `/cancel` is successfully triggered **only** when the status is `PENDING` or `IN_NEGOTIATION`. `DRAFT` states must be rejected at the service level, as they should simply be cleared via the cart endpoints.
2. **Orchestration of the Generic `PATCH :id/status` Endpoint (`STAFF` Exclusive):**
   Security E2E tests simulate a `STAFF` user attempting to force illegal transitions (e.g., from `PENDING` directly to `PAID`). The validator must throw a clean domain exception.
3. **Side Effects Coupled to Specific Transitions:**
   - **Transition to `APPROVED`:** Verifies if stock is physically altered and if the `OutboxSubscriber` automatically generates the audit snapshot natively within the database transaction.
   - **Transition from `APPROVED` to `REJECTED`:** Validates critical concurrency by simulating payment failures and ensuring physical goods return exactly to the original cataloged value.