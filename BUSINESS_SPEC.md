# Enterprise Ecosystem Showcase - Business Specification & Domain Guide

## 🎯 Domain Overview
While architected with the complexities of B2B (Business-to-Business) and B2G (Business-to-Government) in mind, this transactional ecosystem perfectly adapts to high-ticket B2C (Business-to-Consumer) marketplaces. Unlike standard retail models where purchasing is instant and linear, this platform supports dynamic quantity negotiations, service scheduling, strict inventory locks for physical goods, financial immutability constraints, and robust audit trails governing the client-vendor relationship.

---

## 👥 System Actors & Personas
The ecosystem's operational flow is governed by three distinct roles, each acting within clear business boundaries:

### 1. Customer (Buyer)
* **Profile:** Corporate procurement officers, government agents, or high-ticket retail consumers.
* **Core Capabilities:** 
  * Manages an active shopping cart (`DRAFT`).
  * Initiates the acquisition pipeline by submitting orders for review.
  * Collaborates directly with vendors through a secure negotiation timeline.
  * Can approve negotiated terms or cancel pending requests before the final invoicing phase.

### 2. Staff (Vendor / Operator)
* **Profile:** Internal sales analysts, inventory managers, or account executives handling order fulfillment.
* **Core Capabilities:**
  * Reviews incoming market demands (`PENDING` orders).
  * Has the authority to immediately approve valid orders or route them to negotiation.
  * Adjusts transaction scopes (line item quantities) based on real-time stock constraints.
  * Provides fulfillment details, scheduling notes, or rejection reasons upon advancing the order state.
  * Handles billing validation (`PAID` status) or structural rejections due to payment failures.

### 3. Admin (System Administrator)
* **Profile:** IT Infrastructure managers or high-level operations directors.
* **Core Capabilities:**
  * Governs global system settings and security profiles.
  * Promotes or demotes user access roles (RBAC management).
  * Does not participate in the day-to-day commercial transactions or order lifecycles.

---

## 🔄 The Order Lifecycle (Business State Machine)
An order is treated as an immutable commercial ledger that progresses through specific operational checkpoints:

```text
[DRAFT] ──(Checkout)──> [PENDING] ──(Staff Edits/Proposes)──> [IN_NEGOTIATION]
   │                       │                                        │
   └──(Item Removal)       ├──(Staff Direct Approval) ──────────────┤
                           │                                        │
                           ├──(Staff/Customer Rejection)            ├──(Customer or Staff Approval) ──> [APPROVED]
                           │                                        │                                       │
                           └──> [REJECTED] <────────────────────────┘                                       ├──(Staff Paid) ──> [PAID] ──> [DELIVERED]
                                    ▲                                                                       │
                                    └───────────────────────────(Payment Default / Failure) ────────────────┘

```

1. **DRAFT:** Actively managed by the Customer as a transient shopping cart.
2. **PENDING:** Submitted by the Customer. Awaiting initial evaluation by a Staff member.
3. **IN_NEGOTIATION:** Opened by Staff to resolve quantity or availability discrepancies. Direct chat communication is enabled.
4. **APPROVED:** The terms are officially accepted. Financial/Inventory commitments are triggered, and fulfillment instructions are attached.
5. **PAID:** Billing confirmed by Staff. The order is locked and ready for distribution/execution.
6. **DELIVERED:** Logistics completed or services rendered successfully.
7. **REJECTED:** Terminal state representing canceled, failed, or unauthorized workflows.

---

## 📜 Core Business Rules (BR)

### Inventory, Services & Stock Management

* **BR-01 (Polymorphic Constraints):** Only items classified as `PHYSICAL_GOODS` are subject to strict stock count evaluations. Items designated as a `SERVICE` bypass inventory tracking entirely.
* **BR-02 (Fulfillment Communication):** When transitioning an order to `APPROVED`, Staff members must have the ability to attach fulfillment notes. This is especially critical for `SERVICE` items to communicate scheduling windows, locations, or execution details to the Customer.
* **BR-03 (Stock Reservation Boundary):** Inventory is never blocked or reserved during the `DRAFT`, `PENDING`, or `IN_NEGOTIATION` phases to prevent cart hoarding. Stock is strictly deducted only when the order reaches the `APPROVED` state.
* **BR-04 (Inventory Restoration Guard):** If an order already marked as `APPROVED` is forced into the `REJECTED` state by Staff (due to collection failure, timeline expiration, or payment default), the system must instantly and automatically restore the exact quantity of reserved physical goods back to the available catalog stock.

### Financial Integrity & Price Locking

* **BR-05 (Chronological Price Freezing):** The moment a Customer performs a checkout (`DRAFT` to `PENDING`), the current unit prices listed in the catalog are permanently frozen onto the order line items. Future global catalog updates will never retroactively modify the financial commitments of an order already in flight.
* **BR-06 (No Discretionary Discounts):** Procurement negotiations are strictly limited to item volumes, delivery timelines, and availability. Staff members are prohibited from altering unit prices arbitrarily during negotiation phases to maintain corporate compliance.

### Cart & Negotiation Behaviors

* **BR-07 (Single Active Cart Constraint):** A Customer is restricted to exactly one active `DRAFT` instance at any given time. Sending new items while a cart exists will organically synchronize (Upsert) the existing draft, merging matching items or wiping omissions based on the latest payload state.
* **BR-08 (Empty Checkout Prevention):** Transitioning from `DRAFT` to `PENDING` requires at least one valid line item. Processing empty ghost carts is structurally forbidden.
* **BR-09 (Negotiation Timeline Enclosure):** Bidirectional timeline chat messages (`OrderMessageEntity`) can only be transmitted if the targeted order is actively sitting in the `IN_NEGOTIATION` status.

### Security, Autonomy & RBAC

* **BR-10 (Shared Approval & Auditability):** While Customers have the autonomy to approve negotiated terms, Staff operators also retain the system authority to approve orders (`PENDING` or `IN_NEGOTIATION` to `APPROVED`). The immutable chat timeline serves as the audit trail validating that consensus was reached before Staff execution.
* **BR-11 (Pre-Approval Cancellation Rights):** Customers maintain the right to abort their procurement process at any time by triggering a cancellation, provided the order has not yet progressed past the `IN_NEGOTIATION` stage.
* **BR-12 (Data Segregation / IDOR Shield):** Customers can never view, query, or interact with orders owned by other profiles. Staff members bypass this boundary to oversee global marketplace fulfillment.