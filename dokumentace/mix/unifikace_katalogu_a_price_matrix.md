# Detailní plán: Sjednocení Katalogu produktů, Ceníků a Price Matrix

Tento dokument slouží jako podrobný prováděcí plán a kontrolní seznam pro sjednocení sekce **Katalogy a Ceníky** (včetně interní **Price Matrix**) přímo pod rozhraní **Katalogu Produktů**. 

Cílem je mít jedno robustní a komplexní centrální rozhraní (ERP úroveň) s **nulovou duplicitou kódu** a jasným oddělením logiky od prezentace.

---

## 1. Architektonické principy (Zero Duplication & Clean Architecture)

Abychom zabránili duplikování pomocné logiky (např. kategorizace, stromové struktury a lokalizovaných překladů), zavedeme novou vrstvu sdílených pomocných funkcí.

### Vznik nového sdíleného souboru:
Vytvoříme [catalogHelpers.ts](file:///Users/martin/Documents/Projects/sw-development/az-composites/system/src/modules/products/utils/catalogHelpers.ts), kde budou definovány:
1. **`getProductSubcategory(p: Product): string`** - Jednotná funkce pro určení podkategorie materiálu na základě jeho specifikace (vazba, typ, objem). Bude využívána jak v klientské tabulce, tak na serveru v API endpointu pro PDF.
2. **`SUBCATEGORY_NAMES_CS`** - Statický mapovací slovník pro překlad kódů podkategorií (např. `CF` -> "Uhlíková vlákna").
3. **Lokalizační mapování a formátovače**:
   * `formatCurrency(val: number, currency: string)` - Jednotný formát měn (CZK, EUR, USD).
   * `formatPercent(val: number)` - Jednotný formát procent.
   * `translateCategory(id: string, name: string, lang: 'cs' | 'en')` - Překlady kategorií pro Excel i PDF export.
   * `translateUnit(abbr: string, lang: 'cs' | 'en')` - Překlady měrných jednotek.

### Přesuny souborů:
1. **Excel Export Utility**:
   * Z: `src/modules/catalogs/utils/excelExport.ts`
   * Do: `src/modules/products/utils/excelExport.ts` (a přepíšeme ji tak, aby importovala pomocné funkce z `catalogHelpers.ts`).
2. **PDF Šablony pro generování ceníků**:
   * Z: `src/modules/catalogs/components/CatalogPDF.tsx` -> Do: `src/modules/products/components/CatalogPDF.tsx`
   * Z: `src/modules/catalogs/components/PriceMatrixPDF.tsx` -> Do: `src/modules/products/components/PriceMatrixPDF.tsx`
3. **Smazání nepotřebných komponent**:
   * `src/modules/catalogs/components/CatalogDashboard.tsx` (Bude plně nahrazeno integrací do `ProductDataTable.tsx` a novým `ExportPricingDrawer.tsx`).

---

## 2. Podrobný postup v jednotlivých krocích

### Krok 1: Vytvoření sdíleného pomocného souboru
* **Nový soubor**: `src/modules/products/utils/catalogHelpers.ts`
* **Obsah**: 
  * Extrahovaná funkce `getProductSubcategory`.
  * Slovník `SUBCATEGORY_NAMES_CS`.
  * Formátovací metody měn a marží a překlady (původně rozeseté v `CatalogDashboard.tsx` a `excelExport.ts`).

### Krok 2: Příprava dat na serveru (produkty/page.tsx)
Katalog produktů nově načte finanční data ze serverových akcí.

* **Soubor k úpravě**: `src/app/(app)/produkty/page.tsx`
* **Změny**:
  1. Importovat akce z finančního modulu:
     ```typescript
     import { getLatestRates, getGlobalFinanceSettings, getLogisticsTemplates } from '@/modules/finance/actions'
     ```
  2. Rozšířit `Promise.all` o načtení těchto dat:
     ```typescript
     const [
       { data: produkty, error, totalCount },
       lookups,
       { data: rates },
       { data: settings },
       { data: templates }
     ] = await Promise.all([
       getProductsPaged({ page: 0, limit: 30 }),
       getProductLookups(),
       getLatestRates(),
       getGlobalFinanceSettings(),
       getLogisticsTemplates()
     ])
     ```
  3. Předat `rates`, `settings` a `templates` do komponenty `ProductDataTable` skrze props:
     ```tsx
     <ProductDataTable 
       initialData={produkty || []} 
       initialTotalCount={totalCount || 0} 
       lookups={{
         ...lookups,
         rates: rates || [],
         settings: settings || null,
         templates: templates || []
       }} 
     />
     ```

### Krok 3: Nová komponenta `ExportPricingDrawer.tsx`
Tato komponenta nahrazuje kompletní záložku "Generátor Exportů (PDF / Excel)". Zůstane zachována veškerá logika a filtry, aby výstupy pro zákazníky byly identické.

* **Nový soubor**: `src/modules/products/components/ExportPricingDrawer.tsx`
* **Vlastnosti a rozhraní**:
  * Převezme stavy z `CatalogDashboard`:
    * `exportTier` (retail, partner, partner_5, partner_10...)
    * `exportCurrency` (CZK, EUR, USD)
    * `exportLang` (cs, en)
    * `selectedCats` (kategorie) a `selectedSubs` (podkategorie s plným stromovým checkboxem)
  * Zachová metodu `handleDownloadExcel` volající přesunutý `exportCatalogToExcel`.
  * Zachová metodu `handleGeneratePDF` volající API endpoint `/api/katalogy/pdf` s parametry.
  * Obsahuje tlačítko pro administrátorské hromadné přegenerování názvů (`handleBulkRegenerate`).
  * Bude se otevírat jako postranní panel (Shadcn/Base-UI Drawer/Dialog) z lišty filtrů hlavního katalogu.
  * **ŽÁDNÝ duplicitní kód**: Importuje strom kategorií, subkategorií a názvy přímo ze sdíleného `catalogHelpers.ts`.

### Krok 4: Úprava API Endpointu pro generování PDF
API endpoint, který generuje PDF ceníky na serveru, se musí odkázat na nové cesty přesunutých komponent a sdílené utility.

* **Soubor k úpravě**: `src/app/api/katalogy/pdf/route.ts`
* **Změny**:
  1. Změnit importy:
     ```typescript
     const { CatalogPDF } = await import('@/modules/products/components/CatalogPDF')
     const { PriceMatrixPDF } = await import('@/modules/products/components/PriceMatrixPDF')
     const { getProductSubcategory } = await import('@/modules/products/utils/catalogHelpers')
     ```
  2. Smazat lokálně definovanou metodu `getProductSubcategory` (řádky 7-28), čímž odstraníme duplicitu.

### Krok 5: Integrace do `ProductDataTable.tsx`
Tabulka bude nově umět dynamicky přepínat mezi pohledy a měnit sloupce.

* **Soubor k úpravě**: `src/modules/products/components/ProductDataTable.tsx`
* **Změny**:
  1. **Rozšíření interface Props**: Přidat `rates`, `settings` a `templates` do typové definice `lookups`.
  2. **Stavy**:
     ```typescript
     const [viewMode, setViewMode] = React.useState<'produkty' | 'sales' | 'cogs'>('produkty')
     const [unitMode, setUnitMode] = React.useState<'basic' | 'packaging'>('basic')
     ```
  3. **Výpočet Pricing na klientovi**:
     Pro každý produkt (při zobrazení finančních módů `sales`/`cogs`) provést výpočet cen v reálném čase pomocí finanční utility `calculateProductPricing` (importované z `@/modules/finance/utils/calculations`).
  4. **Přepínač pohledů v Toolbaru (Hlavičce)**:
     * Přidat `Select` pro **Pohled** (Produkty / Prodejní ceny / COGS).
     * Přidat `Select` pro **Přepočet** (1 základní MJ / Celé balení).
     * Přidat tlačítko **Exportovat ceník**, které otevře nově vytvořený `ExportPricingDrawer`.
     * Přidat tlačítko **Exportovat Price Matrix (PDF)** (původní `handleGenerateMatrixPDF`), které vygeneruje PDF matrix na základě aktuálních filtrů a pohledu.
  5. **Dynamické definice sloupců**:
     * Na základě `viewMode` modifikovat pole `columns` pro Tanstack Table:
       * Pro `produkty`: standardní sloupce.
       * Pro `cogs`: SKU, Název, Logistika/Dodavatel, Nákupní cena, Doprava, Clo, Bankovní poplatky, Proclení, Odpady, Balné, Rezerva, Landed Cost.
       * Pro `sales`: SKU, Název, Logistika/Dodavatel, Nákupní cena, Pořizovací cena, B2C Retail, B2B Partner, B2B slevy (-5%, -10%, -15%, -20%), Risk Marže, Safe Marže.
     * U finančních sloupců zohlednit násobení parametrem `mult` (odvíjejícím se od `unitMode == 'packaging'`), shodně jako v původním dashboardu.

### Krok 6: Odstranění staré sekce z menu a smazání kódu
Po zprovoznění a otestování dojde k vyčištění aplikace.

* **Soubory k úpravě/smazání**:
  1. Smazat `src/app/(app)/katalogy/page.tsx`
  2. Smazat celou složku `src/modules/catalogs` (komponenty a utility byly přesunuty do `products`).
  3. Odstranit odkaz na ceníky v `src/shared/components/layout/AppSidebar.tsx` (řádek s `Katalogy a Ceníky`).

---

## 3. Akceptační kritéria a kontrolní seznam pro porovnání

| Oblast | Splněno (Ano/Ne) | Popis kontroly |
| :--- | :---: | :--- |
| **Pohled Produkty** | | Výchozí tabulka v `/produkty` zobrazuje přesně ta stejná metadata jako dříve. Všechny akce v řádku (Editace, Duplikace, Soft-delete) fungují. |
| **Finanční analýza (COGS)** | | Zobrazí se sloupce nákupu, dopravy, cla a poplatků. Výpočet Landed Cost odpovídá dřívějšímu stavu v Price Matrix. |
| **Prodejní ceny (Sales)** | | Zobrazují se správně B2C, B2B a odstupňované B2B slevy. Risk/Safe marže se správně barví dle výše marže. |
| **Přepočet na Balení** | | Přepnutí jednotky na "Celé balení" správně vynásobí všechny finanční sloupce počtem jednotek v balení. |
| **Generátor exportů (Drawer)** | | Nový panel obsahuje volbu hladiny cen, měny a jazyka. Všechny PDF i Excel exporty odpovídají. |
| **Žádná duplicita kódu** | | Z API endpointu `/api/katalogy/pdf` byla zcela smazána duplicitní funkce `getProductSubcategory` a nahrazena importem ze sdíleného `catalogHelpers.ts`. |
