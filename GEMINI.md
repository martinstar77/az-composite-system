# AZ-Composites Architectural Mandates

This document defines the core architectural standards for this project. All development must strictly adhere to these rules to ensure scalability and maintainability.

## 1. Modular Monolith Architecture
The codebase is organized into domain-driven modules located in `src/modules/`.
**Node.js Standard:** The project is running on bleeding-edge Node.js v25+. Code should leverage the latest performance improvements and standards.

### Module Structure
Each module (e.g., `src/modules/products/`) should follow this internal structure:
- `components/`: UI components specific to the module.
- `actions/`: Server Actions and data fetching logic.
- `types/`: TypeScript definitions and Zod schemas.
- `hooks/`: Module-specific React hooks.
- `utils/`: Logic unique to the domain.
- `api/` (Future): REST/GraphQL endpoints for Headless integration.

## 2. Shared Core
Universal code used across multiple modules resides in `src/shared/`.
- `src/shared/components/`: Generic UI elements (Shadcn, common wrappers).
- `src/shared/lib/`: Library initializations (Supabase, external APIs).
- `src/shared/utils/`: Common utility functions.

## 3. Separation of Concerns & Omnichannel Readiness
- **Headless Commerce Preparation:** This ERP is designed to eventually serve as the single source of truth for B2B and B2C e-commerce platforms. Data models (PIM, WMS) must never be tightly coupled to the internal CRM UI. Data must be structured so it can be exposed via APIs later.
- **Thin Routing Layer:** Files in `src/app/` (pages, layouts) must be "thin". They should only handle routing, layout orchestration, and calling module actions.
- **Data Access:** All database interactions (Supabase) must be encapsulated within module `actions/` or shared `lib/`. UI components should never call Supabase directly.
- **Server Components:** Prefer Server Components for data fetching. Pass data down to Client Components for interactivity.

## 4. Coding Standards & UI/CSS Rules
- **Naming:** Use descriptive English names in code (UI strings can be Czech).
- **Types:** Strictly type all data structures and function returns. Avoid `any`.
- **Validation:** Use Zod for input and data validation.
- **UI Architecture (NO HARDCODING):** 
  - **Zero Hardcoded Values:** Never use hardcoded HEX colors (e.g., `text-[#8A0485]`) or arbitrary px values in component files.
  - **Centralized CSS:** All design tokens (Colors, Fonts, Radii) MUST be defined exclusively as CSS variables in `src/app/globals.css` (e.g., `--primary: #8A0485`).
  - **Tailwind Classes Only:** Components must only use Tailwind semantic classes (e.g., `bg-primary`, `text-muted-foreground`, `rounded-lg`) which automatically pull from `globals.css`.
  - **Fonts:** Fonts are centrally injected via Next.js `next/font/google` in `layout.tsx` and mapped to CSS variables (`--font-geist-sans`). Use classes like `font-sans` to apply them.
  - **Shadcn/ui (Base UI version):** This project uses the `@base-ui/react` version of Shadcn components. 
    - **NO asChild:** Do NOT use the `asChild` prop (it will cause hydration errors or TypeScript failures).
    - **USE render prop:** To render a custom component as a trigger (e.g., a Button inside a DialogTrigger), use the `render` prop: `<DialogTrigger render={<Button />}>...</DialogTrigger>`.
  - **Enterprise List Views (DataGrid Mandate):** When displaying collections of data (Products, Suppliers, Inventory, Orders), NEVER use "Card Grid" layouts if the data volume is expected to exceed 20 items. ALWAYS use highly dense, scalable Data Tables (`Tanstack Table` via Shadcn) with explicit support for filtering, sorting, and pagination. Card views should be strictly reserved for high-level dashboards or localized selections.
  - **Smart SKU & Identification Rules:**
    - **SKU Separation:** Use dashes `-` for SKU segment separation. Avoid brackets `()` or special characters to ensure compatibility with URL parameters and barcode scanners. (e.g., `CF-WF-96-1K-T22-P11-E` instead of `CF-WF-96-1K-T22(P11)-E`).
    - **SKU Decomposition:** Every segment of a "Smart SKU" (Material, Weight, Weave) must be decomposed and stored as individual key-value pairs in the `specifikace` (JSONB) column. This ensures the system can filter "All 1K fabrics" without complex string parsing.
    - **Immutable PKs:** Never use SKUs as Database Primary Keys. Use system-generated UUIDs only.
  - **Audit Trail Mandate:** Any Server Action that modifies data (Insert, Update, Delete) in core tables (Products, Prices, Inventory) MUST create a record in the system audit log.
  - **Data Integrity Standards:**
    - **Atomic Transactions:** All operations involving multiple table updates (e.g., creating an order + updating stock) MUST use `db.transaction()` to ensure atomicity.
    - **Soft Deletes:** Core entities (Products, Suppliers, Customers) must never be permanently deleted from the DB. Use a `deleted_at` timestamp.
    - **Optimistic Concurrency (OCC):** Critical records must use a versioning system (e.g., `updated_at` check) to prevent race conditions during simultaneous edits.
    - **Multi-tenancy (Data Isolation):** Database queries MUST respect `tenant_id` where applicable to ensure data isolation between future legal entities.
  - **Infrastructure & Reliability:**
    - **PITR Ready:** Database operations must be compatible with Point-in-Time Recovery. Avoid bulk deletes without audit logs.
    - **IaC Compliance:** All environmental configurations must be documented for future Infrastructure-as-Code automation.
  - **Media & Assets:** All binary files (PDFs, Images) must be stored in Supabase Storage with CDN enabled. Large images must be optimized/resized on the edge.
  - **Testing Standard:** Core business logic (especially financial calculations and stock movements) MUST be accompanied by automated Vitest or Playwright tests to ensure system reliability after every change.
  - **Ecosystem Consistency Mandates:**
    - **Uniform Auditing:** Every entity table (Products, Suppliers, Inventory, etc.) MUST include `vytvoril_id` and `upravil_id` columns linked to user profiles. Server actions must automatically populate these using the authenticated session.
    - **Standardized DataGrids:** All list views must use a unified layout: Dense rows, specific badge styles for categories/status, and an "Autor / Změna" audit column as the penultimate column.
    - **Branded UI:** All new components (Dialogs, Toasts, Inputs) MUST strictly utilize CSS variables from `globals.css`. Hardcoded hex codes are strictly forbidden.

## 5. Project Documentation
All high-level planning, roadmaps, and data templates must be stored in the `/dokumentace/` directory. This includes:
- `MASTER_PLAN.md`: The 6-phase roadmap for the ERP/CRM system.
- `product-database-plan.md`: The Enterprise schema strategy.
- `DATA_TEMPLATE.md`: Instructions for data structure imports.
