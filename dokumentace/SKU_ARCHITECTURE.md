# Enterprise SKU Architecture Strategy

## 1. Executive Summary & Philosophy
As a technology-driven distributor in the composites industry, SKU generation must follow strict logic (Smart SKUs). An SKU is not just a random identifier; it is a **machine-readable DNA string** of the product.
- **Rule 1: Dash Delimiter Only.** No brackets `()`, no spaces, no underscores. Only `-`.
- **Rule 2: Max 6 Segments.** To keep codes legible on physical labels.
- **Rule 3: Extensible JSONB Mapping.** Every segment in the SKU must correspond to a distinct `specifikace` attribute in the database for instant filtering.

## 2. Deep Analysis of Provided Data & Proposed Solutions

### 2.1 Reinforcement Materials (Výztužné materiály)
**Current:** `CF-WF-160-3K-T22(P11)-12`, `GF-...`, `AF-...`, `BF-HYPERMAT-300`
**Analysis:** The trailing suffixes (-12, -6, -0, -E) likely refer to roll widths (e.g., 120cm, 60cm) or epoxy sizing. `(P11)` is problematic for barcode generation.
**Proposed Standard Rule:** `[Material]-[Form]-[Weight]-[Tow]-[Weave]-[Width/Finish]`
*   *Material:* CF (Carbon), GF (Glass), AF (Aramid), BF (Bio), OF (Other)
*   *Form:* WF (Woven), UD (Uni), BIAX, MAT
*   *Weight:* Numeric (e.g., 160)
*   *Tow:* 1K, 3K, 12K, NA (if not applicable)
*   *Weave:* P (Plain), T22 (Twill 2/2), HYPER (Hypermat)
*   *Width/Sizing:* W120 (120cm), W60, EPOX (Epoxy compatible)
*   **Example Output:** `CF-WF-160-3K-T22-W120`

### 2.2 Prepregs
**Current:** `PP-CF`
**Proposed Standard Rule:** `[Category]-[BaseMaterial]-[Weight]-[ResinSystem]`
*   *Category:* PP (Prepreg)
*   *Base:* CF, GF, AF
*   *Weight:* Numeric (e.g., 300)
*   *Resin:* EPX (Epoxy), PHN (Phenolic)
*   **Example Output:** `PP-CF-300-EPX`

### 2.3 Resins & Adhesives (Pryskyřice a Lepidla)
**Current:** `VE-GC-M`, `ADH-EP-BL-195`
**Analysis:** Needs separation between base chemistry, type, and specific identifier/color.
**Proposed Standard Rule:** `[Type]-[Chemistry]-[Variant]-[Color/ID]`
*   *Type:* RES (Resin), GEL (Gelcoat), ADH (Adhesive)
*   *Chemistry:* EP (Epoxy), VE (Vinylester), PU (Polyurethane)
*   *Variant/Speed:* FAST, MED, SLOW, INF (Infusion), LAM (Laminating)
*   *Color/ID:* BLK (Black), CLR (Clear), 195 (Custom ID)
*   **Example Output:** `RES-EP-INF-CLR` or `ADH-EP-MED-195`

### 2.4 Liquids & Cleaners (Spotřební chemie)
**Current:** `RST5-5l`, `RST5-200l`
**Analysis:** Packaging size is mixed directly into the base product name. In an ERP, packaging size belongs to the Logistics layer, but if sold as distinct SKUs, it must be the final suffix.
**Proposed Standard Rule:** `[Category]-[Brand/ID]-[Packaging]`
*   *Category:* CLN (Cleaner), REL (Release Agent), THN (Thinner)
*   *Brand/ID:* RST5, ACET
*   *Packaging:* 5L, 200L, 1000L
*   **Example Output:** `CLN-RST5-200L`

### 2.5 Grinding & Polishing
**Current:** `REX-CAN-1KG`, `REX-BOT-0.5KG`
**Proposed Standard Rule:** `[Category]-[Brand/ID]-[Container]-[Weight]`
*   *Category:* POL (Polishing), ABR (Abrasives/Grinding)
*   *Brand/ID:* REX, 3M, MIRA
*   *Container:* CAN (Canister), BOT (Bottle), PAD (Pad)
*   *Size/Weight:* 1KG, 500G, 150MM
*   **Example Output:** `POL-REX-CAN-1KG`

### 2.6 Cores & Active Core Technology
**Current:** No naming.
**Analysis:** Cores are defined by material, density (kg/m3), and thickness (mm).
**Proposed Standard Rule:** `[Category]-[Material]-[Density]-[Thickness]-[Finish]`
*   *Category:* COR (Standard Core), ACT (Active Core)
*   *Material:* PVC, PET, BAL (Balsa), HON (Honeycomb)
*   *Density:* 60, 80, 100
*   *Thickness:* 10MM, 25MM
*   *Finish:* PL (Plain), GS (Grid Scored), perf (Perforated)
*   **Example Output:** `COR-PVC-80-10MM-GS`

### 2.7 Tools, Machining Tools & Semi-finished
**Current:** No naming.
**Proposed Standard Rule:** `[Category]-[Subcategory]-[Identifier]`
*   *Category:* TOL (Hand Tools), MAC (Machining), SFP (Semi-Finished)
*   *Subcategory:* ROL (Roller), CUT (Cutter), PLT (Plate), TUB (Tube)
*   *Identifier:* 50MM, ALU (Aluminum), CF (Carbon)
*   **Example Output:** `TOL-ROL-50MM` or `SFP-TUB-CF-20MM`

## 3. The Implementation Plan (Next Steps for Phase 1.7)
1. **Approval:** Obtain user approval on the rules above.
2. **Schema Extension:** Update the `c_kategorie` lookup table in the DB to include all these new categories (CLN, POL, COR, ACT, TOL, SFP).
3. **Form Refactoring:** Expand the `ProductForm.tsx` "Smart SKU Generator" logic. It will use a `switch` statement based on `kategorie_id` to render the correct dropdowns (e.g., showing 'Density' and 'Thickness' if 'Cores' is selected) and auto-generate the codes according to these standardized rules.