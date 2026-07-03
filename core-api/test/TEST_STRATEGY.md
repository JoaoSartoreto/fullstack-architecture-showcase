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

---

### 🔍 Findings and Points of Attention for E2E Tests

Upon deep inspection of the correlation between `ALLOWED_STATUS_TRANSITIONS` and the exposed controller methods, there are three implicit behaviors in the business rules that the E2E suite must rigidly validate:

#### 1. The Asymmetry of `CUSTOMER` Cancellation (`BR-11` vs. Transition Graph)
In the `ALLOWED_STATUS_TRANSITIONS` map, the `DRAFT` state can strictly progress to `PENDING`. However, the `cancelByCustomer` method in the controller allows a client to abort a process as long as it hasn't passed `IN_NEGOTIATION`.
* **Expected Behavior:** If a customer attempts to trigger the `/cancel` endpoint while the order is still a `DRAFT`, the system must reject the state transition at the service level (since a cart draft should simply be cleared or updated via `POST /cart`, not transformed into a rejected transaction record). The E2E test must ensure that cancellation is successfully triggered **only** when the status is `PENDING` or `IN_NEGOTIATION`.

#### 2. Orchestration of the Generic `PATCH :id/status` Endpoint (`STAFF` Exclusive)
Since `STAFF` has a generic endpoint to update the status (`updateStatus`), the backend must internally guarantee that this endpoint respects hierarchical constraints.
* If the current status is `DRAFT`, `STAFF` cannot force a change via this endpoint (since the draft lifecycle belongs solely to the buyer).
* If the current status is `IN_NEGOTIATION`, `STAFF` can move it to `APPROVED` or `REJECTED`.
* Our security E2E tests will need to simulate a `STAFF` user attempting to force illegal transitions (such as moving directly from `PENDING` to `PAID` or from `DRAFT` to `APPROVED`) to validate that the validator throws a clean domain exception and the ecosystem blocks the request.

#### 3. Side Effects Coupled to Specific Transitions
Integration tests will be fundamental to validate `STAFF` transitions that trigger heavy infrastructure logic:
* **Transition to `APPROVED`:** The test must verify if the stock was altered in the database and if the persistence triggered the `OutboxSubscriber` hook to generate the audit snapshot in the `outbox_events` table atomically.
* **Transition from `APPROVED` to `REJECTED`:** A critical concurrency test scenario. We must simulate a payment failure and validate if the quantity of physical goods returned exactly to the original cataloged value.