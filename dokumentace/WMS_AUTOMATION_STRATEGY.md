# WMS Automation & Paperless Strategy: AZ Composite

## 1. Vision: The Efficient Warehouse
Our goal is to build a "Paperless" operation where a minimal number of employees can handle high volumes of goods through extreme automation and mobile-first processes.

## 2. Phase 1: Foundational Tracking (The Garage Stage)
Even with a small initial inventory, the system must act like a large-scale warehouse.

### 2.1 Warehouse Locations (`c_skladove_lokace`)
- Every physical shelf, rack, or freezer spot must have a unique ID (e.g., `REG-A-01`).
- Every location will have its own QR code.
- **Action:** Before receiving items, the user "names" their storage spots in the system.

### 2.2 QR Labeling Strategy (Zero Budget, High Efficiency)
- **ID-based Tracking:** Labels will contain a QR code representing the **UUID** of the specific inventory item (e.g., a specific roll of fabric), NOT just the SKU.
- **Printing:** Integrated PDF generation in the CRM to print QR labels on standard A4 sticker sheets (Laser printer compatible).
- **Physical Receipt:** Upon arrival, goods are assigned a UUID, a label is printed and stuck to the roll/drum immediately.

## 3. Phase 2: Mobile Integration & PWA
Transitioning from manual data entry to "Point-and-Scan" operations.

### 3.1 PWA (Progressive Web App) Capabilities
- The Next.js ERP will be configured as a PWA, allowing it to be "installed" on mobile phones.
- Use of the Web Serial/Camera API for direct barcode/QR scanning via the phone's camera.

### 3.2 "Pipni a Uloz" (Scan to Store) Workflow
1. Skladník scans the **Location QR** (e.g., REG-A-01).
2. Skladník scans the **Item QR** (the specific roll).
3. The ERP automatically updates the record: `Item {UUID} is now at {REG-A-01}`.

### 3.3 Optimized Dispatch (Scan to Ship)
- When shipping an order, the warehouse worker must scan each item before it leaves.
- This automatically decrements stock levels, records the exact batch sent to the customer (traceability), and updates the financial COGS for that specific sale.

## 4. Architectural Readiness
- **Database:** Ensure `inventory_items` table supports `location_id` and `unit_uuid`.
- **API:** Ensure scanning endpoints are lightweight and optimized for mobile latency.
