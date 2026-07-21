# Frontend Architecture & Educational Roadmap

## 🎯 Vision
This client application serves as the User Interface for the Enterprise Ecosystem Showcase. It is built to strictly respect the backend's DDD architecture, enforcing RBAC (Role-Based Access Control) on the client side, and providing a seamless UX for the complex Order State Machine.

## 🏗️ Core Tech Stack & Decisions
- **Framework:** React + Vite (Chosen for esbuild's sub-millisecond HMR and modern module resolution).
- **Language:** TypeScript (Strict mode enabled to guarantee type safety with the NestJS API contracts).
- **Styling Engine:** Tailwind CSS v4 (Oxide Engine). Bypassed v3 to leverage the native Rust compiler, dropping the need for explicit PostCSS and Autoprefixer configurations while maintaining JIT compilation and cross-browser prefixing under the hood.
- **UI Architecture:** Headless UI approach (shadcn/ui planned) to maintain 100% control over rendering and Tailwind styling without compromising accessibility (a11y) and keyboard navigation.

## 📂 Architecture Structure (Domain & Core Separation)
The `src/` directory avoids root-level clutter by splitting infrastructure from business domains:
- `app/`: Global entry points, providers, routing configuration, and global stylesheets.
- `core/`: Shared, domain-agnostic infrastructure (dumb UI components, global hooks, API client wrappers, TypeScript types, and global stores).
- `features/`: Isolated business logic bounded contexts (e.g., `orders`, `catalog`, `auth`).

## 🚀 Implementation Phases
1. **Foundation (Completed):** Vite + React + TS setup, Tailwind v4 engine integration, and architecture blueprinting.
2. **UI/UX Infrastructure:** Integrating the Headless UI components (shadcn/ui), defining design tokens, and building the core layout shells (Customer vs. Staff).
3. **Data Fetching & Server-State Layer:** Setting up TanStack Query and Axios to handle API communication, generic pagination, and aggressive caching.
4. **Routing & Client-Side RBAC:** Implementing React Router to guard routes based on JWT payload roles, preventing unauthorized chunk loading.
5. **Edge Telemetry:** Engineering the client-side UUIDv7 generator and the `UI_INTERACTION` envelope dispatch mechanism without blocking the main render thread.

## 🧠 Educational Backlog (To Learn / Deep Dive)
*As the implementation progresses, these theoretical concepts must be analyzed and understood:*
- [ ] **CSS Compilation (JIT vs AOT):** How does Tailwind v4 parse ASTs to generate minimal CSS compared to traditional methodologies?
- [ ] **Browser Rendering Pipeline:** How do tools like Autoprefixer affect the Blink/V8 rendering engines?
- [ ] **Server-State vs Client-State:** Why separate UI ephemeral state from API caching?
- [ ] **Edge Telemetry:** How to efficiently generate UUIDv7 tokens in the browser thread.