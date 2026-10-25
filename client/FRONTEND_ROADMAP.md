# Frontend Architecture & Educational Roadmap

## 🎯 Vision
This client application serves as the user interface for the
Enterprise Ecosystem Showcase. It translates the backend's business
domains and order state machine into an intuitive user experience.

The frontend adapts navigation and available actions to the
authenticated user's role, while the Core API remains responsible
for enforcing authorization and business rules.

## 🏗️ Core Tech Stack & Decisions

- **Framework:** React 19 + Vite 8, using Rolldown for
  bundling and Vite's HMR support for development.
- **Language:** TypeScript with strict type checking.
- **Styling:** Tailwind CSS v4 integrated via `@tailwindcss/vite`.
- **Design System:** Semantic CSS custom properties mapped to Tailwind utilities through `@theme inline`.
- **Theming:** Light and dark themes using CSS variables and a class-based `dark` variant.
- **UI Components:** shadcn/ui components maintained locally, with Radix primitives and Class Variance Authority.
- **Icons:** Lucide React.

## 📂 Architecture Structure (Domain & Core Separation)
The `src/` directory avoids root-level clutter by splitting infrastructure from business domains:
- `app/`: Global entry points, providers, routing configuration, and global stylesheets.
- `core/`: Shared, domain-agnostic infrastructure (dumb UI components, global hooks, API client wrappers, TypeScript types, and global stores).
- `features/`: Isolated business logic bounded contexts (e.g., `orders`, `catalog`, `auth`).

## 🚀 Implementation Phases

### Phase 1: Foundation (Completed)

- [x] Bootstrap React, Vite, and TypeScript.
- [x] Integrate Tailwind CSS v4.
- [x] Define the initial frontend directory architecture.

### Phase 2: UI/UX Infrastructure (In Progress)

- [x] Integrate shadcn/ui with the existing architecture.
- [x] Configure semantic design tokens.
- [x] Implement light and dark theme foundations.
- [x] Validate reusable Button component variants.
- [x] Configure shadcn CLI aliases.
- [ ] Define the application navigation structure.
- [ ] Build shared application layout components.
- [ ] Create Customer and Staff layout shells.
- [ ] Validate responsive behavior and accessibility.
- [ ] Implement user-facing theme switching and preference persistence.

### Phase 3: Data Fetching & Server State (Planned)

- [ ] Evaluate native Fetch API versus Axios.
- [ ] Define the HTTP client and API error-handling strategy.
- [ ] Integrate TanStack Query for server-state management.
- [ ] Implement typed API contracts, pagination, and filtering.
- [ ] Define appropriate caching and invalidation strategies.

### Phase 4: Routing & Client-Side Authorization UX (Planned)

- [ ] Configure React Router.
- [ ] Implement authenticated application routes.
- [ ] Retrieve the authenticated user profile.
- [ ] Adapt navigation and available actions to user roles.
- [ ] Separate Customer, Staff, and Admin experiences.

**Architectural constraint:** Authorization and business rules
must be enforced by the Core API, never solely by client-side
route guards or UI visibility.

### Phase 5: Edge Telemetry (Planned)

- [ ] Define the frontend telemetry event contract.
- [ ] Implement trace identifier generation and propagation.
- [ ] Capture relevant UI interactions and rendering errors.
- [ ] Integrate telemetry ingestion with the Core API.
- [ ] Validate non-blocking telemetry delivery.

## ✅ Validation

The frontend foundation has been validated with:

- `npm ci`
- `npm audit`
- `npm run lint`
- `npm run build`
- `npx vite build --configLoader native`

Light and dark theme behavior was also checked
using browser DevTools and computed CSS styles.

## 🧠 Educational Backlog (To Learn / Deep Dive)
*As the implementation progresses, these theoretical concepts must be analyzed and understood:*
- [ ] **CSS Compilation (JIT vs AOT):** How does Tailwind v4 parse ASTs to generate minimal CSS compared to traditional methodologies?
- [ ] **CSS Compilation and Browser Rendering:**
      How does Tailwind generate CSS, and how does the browser
      parse styles, calculate layout, paint, and composite
      the resulting interface?
- [ ] **Server-State vs Client-State:** Why separate UI ephemeral state from API caching?
- [ ] **Edge Telemetry:** How to efficiently generate UUIDv7 tokens in the browser thread.
