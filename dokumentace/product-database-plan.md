# Product Database Implementation Plan

## 1. Objective
Design and implement a robust, scalable product database for composite materials using a hybrid SQL/JSONB approach. Establish a clear pipeline for migrating existing Excel data into the new system and design a modular UI that supports dynamic product attributes and company branding.

## 2. Enterprise-Grade Schema Design Strategy
We are moving away from a "flat" Excel-like structure to a fully relational, scalable architecture. The design strictly separates the physical product (PIM) from its inventory (WMS) and procurement data.

### 2.1 Lookup Tables (Číselníky) for Extensibility
To ensure the system scales without requiring database schema changes when new business lines are added, we will use dedicated lookup tables:
*   `product_categories`: (e.g., vyztuzne_materialy, prepregy, pryskyrice)
*   `units_of_measure` (UoM): (e.g., m2, kg, bm, l, ks) - Ensures strict mathematical calculation capability.
*   `label_types`: (e.g., vlastni, white_label, cizi)

### 2.2 Core Product Table (`products` - PIM)
This table defines the physical entity and its default rules. It does **not** contain specific supplier prices or current stock levels.
*   **Identification:** `id` (UUID), `sku` (String, Unique), `name` (String)
*   **Classification:** `category_id` (FK), `base_uom_id` (FK)
*   **Logistics (Numeric):** `qty_per_package` (Numeric), `package_uom_id` (FK), `package_weight_kg` (Numeric), `shelf_life_months` (Integer)
*   **Workflow Defaults:** `default_storage_type` (Enum/Lookup), `default_dispatch_process` (Enum/Lookup), `default_label_type_id` (FK), `catalog_status` (draft, active, obsolete)

### 2.3 Flexible Attributes (JSONB)
*   `specifications` (JSONB): Stores category-specific technical data (e.g., weave type for carbon, mix ratio for resin).
*   **Performance:** A `GIN` index will be applied to this column to ensure lightning-fast querying across thousands of items based on dynamic attributes.

### 2.4 Future Modules Separation
*   **Procurement (`product_suppliers`):** Will handle Supplier ID, MOQ, Lead Time, Purchase Price (EUR), Customs Tariffs.
*   **Inventory & Batches (`inventory_batches`):** Will handle specific roles/drums, calculated expiration dates, and landed cost (COGS) per batch.
*   **Pricing Engine & Margins (Layer 3):** This is the dynamic calculation engine. It takes the COGS from Procurement/Inventory, applies current exchange rates, adds fixed fees (packaging, customs, bank fees), and applies the `target_margin` to dynamically generate the final `selling_price`.
*   **Financial Module (Future Vision):** A broader module encompassing cash flow tracking, invoice payments (tracking the '0 days' payment terms), and overall profitability analysis across all product categories.

## 3. UI/UX & Branding Considerations
*   **Branding:** Integrate company logos into the layout (header, auth pages, sidebar).
*   **Dynamic Forms:** The "Add/Edit Product" UI will dynamically render different input fields based on the selected `category` by parsing the expected keys for the `specifications` JSONB object.
*   **Data Grid:** A robust data table (Shadcn/Tanstack Table) to display products, supporting filtering by core attributes and sorting.

## 4. Implementation Pipeline

### Phase 1: Data Definition (Current Step)
1.  Gather existing Excel column headers.
2.  Define the primary material categories.
3.  Finalize the SQL schema and JSONB structures based on the gathered data.

### Phase 2: Database Migration
1.  Generate a new Supabase migration (`npx supabase migration new product_schema_v2`).
2.  Write the SQL to create the updated `products` table, replacing the initial mock table.
3.  Apply the migration to the local database.

### Phase 3: Data Import Script
1.  Convert the user's Excel file to CSV.
2.  Write a Node.js script (`scripts/import-products.ts`) using a CSV parser (e.g., `csv-parse`) and the Supabase client.
3.  The script will map CSV columns to the Hybrid SQL/JSONB structure and batch insert the records.

### Phase 4: Application Update
1.  Update TypeScript definitions (`src/modules/products/types/index.ts`) to match the new schema.
2.  Update Server Actions (`src/modules/products/actions/index.ts`) for fetching data.
3.  Refactor the Product List UI to utilize a proper data table component.
4.  Implement company branding (Logos) in the application shell.

## 5. Verification
*   Verify the database schema in Supabase Studio.
*   Run the import script and validate data integrity.
*   Ensure the frontend successfully fetches and displays the imported hybrid data.