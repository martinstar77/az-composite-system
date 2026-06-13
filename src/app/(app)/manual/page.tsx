import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Manuál systému | AZ Composite",
  description: "Uživatelská a technická dokumentace ERP systému AZ Composite.",
}

export default function ManualPage() {
  return (
    <div className="w-full max-w-4xl mx-auto pb-20">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Manuál ERP Systému</h1>
        <p className="text-muted-foreground mt-2 text-lg">Průvodce architekturou a používáním platformy AZ Composite.</p>
      </div>

      <div className="space-y-12">
        {/* Section 1: Philosophy */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-primary border-b border-zinc-200 dark:border-zinc-800 pb-2">1. Vize a Filozofie (Paperless)</h2>
          <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300">
            <p>
              Tento systém není pouze "evidencí" tabulek, jako byl dřívější Excel. Je to <strong>Digitální Dvojče (Digital Twin)</strong> vaší firmy. 
              Hlavním cílem architektury je <em>Paperless Warehouse (Bezpapírový sklad)</em> a maximální automatizace.
            </p>
            <ul>
              <li><strong>Zero Memory Load:</strong> Zaměstnanci si nemusí pamatovat kódy. Systém je generuje.</li>
              <li><strong>Traceability:</strong> Vše, co projde firmou, má od Fáze 4 svůj unikátní QR kód a je sledovatelné až k zákazníkovi.</li>
              <li><strong>Omnichannel:</strong> Data z tohoto CRM budou v budoucnu přímo napojena na veřejný B2C e-shop a B2B portál.</li>
            </ul>
          </div>
        </section>

        {/* Section 2: Smart SKU */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-primary border-b border-zinc-200 dark:border-zinc-800 pb-2">2. Smart SKU (Chytré kódy)</h2>
          <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300">
            <p>
              Aby mohl budoucí e-shop fungovat bezchybně a zákazníci mohli filtrovat materiály podle gramáže nebo typu vazby, používáme tzv. <strong>Smart SKU</strong>.
            </p>
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg my-4">
              <h4 className="text-foreground font-semibold mt-0">Jak přidat produkt (Katalog):</h4>
              <ol className="mb-0">
                <li>Klikněte na tlačítko <strong>+ Přidat produkt</strong> v sekci Katalog.</li>
                <li><strong>Nejprve vyberte Kategorii.</strong> Toto je klíčové! Jakmile vyberete např. "Jádrové materiály", systém pochopí, jaké parametry bude potřebovat.</li>
                <li>Formulář vám následně nabídne specifické roletky (Materiál, Hustota, Tloušťka).</li>
                <li>Systém <strong>automaticky vygeneruje kód</strong> (např. <code>COR-PVC-80-10MM-PL</code>) a tyto parametry skrytě uloží do databáze pro e-shop.</li>
              </ol>
            </div>
            <h3>Pravidla pojmenování (Ukázky):</h3>
            <ul>
              <li><strong>Výztužné materiály:</strong> <code>[Materiál]-[Typ]-[Gramáž]-[Vlákno]-[Vazba]</code> (např. CF-WF-200-3K-T22)</li>
              <li><strong>Pryskyřice a Lepidla:</strong> <code>[Typ]-[Chemie]-[Rychlost]-[Barva/ID]</code> (např. RES-EP-FAST-CLR)</li>
              <li><strong>Spotřební chemie:</strong> <code>[Kategorie]-[Značka]-[Obal]</code> (např. CLN-RST5-200L)</li>
              <li><strong>Pěny a Jádra (Cores):</strong> <code>[Kategorie]-[Materiál]-[Hustota]-[Tloušťka]-[Úprava]</code> (např. COR-PVC-80-10MM-PL)</li>
            </ul>
            <p className="text-sm text-destructive mt-4">
              <strong>Zákaz:</strong> Nikdy v systému nepoužívejte pro kódy závorky <code>()</code> nebo mezery. Dělají problémy čtečkám QR kódů. Používejte pouze pomlčky <code>-</code>.
            </p>
          </div>
        </section>

        {/* Section 3: WMS Logistics */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-primary border-b border-zinc-200 dark:border-zinc-800 pb-2">3. Logistika a Sklad (WMS)</h2>
          <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300">
            <p>
              U každého produktu nastavujete dvě klíčové jednotky:
            </p>
            <ul>
              <li><strong>Základní měrná jednotka:</strong> V čem se materiál fyzicky počítá a prodává (nejčastěji <code>m²</code> nebo <code>kg</code>).</li>
              <li><strong>Jednotka balení:</strong> V čem to fyzicky leží v regálu (role, sud, barel). Pokud má role 50 běžných metrů, napíšete Množství: 50 a Jednotku: bm.</li>
            </ul>
            <h3>Skladové hladiny (Digital Twin)</h3>
            <p>
              U produktů vyplňujete <strong>Minimální</strong> a <strong>Optimální</strong> skladovou zásobu. Pokud fyzický sklad klesne pod minimální hodnotu, 
              číslo v tabulce zčervená. To dává oddělení nákupu jasný signál, že je nutné materiál doobjednat od dodavatele.
            </p>
          </div>
        </section>

        {/* Section 4: Security */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-primary border-b border-zinc-200 dark:border-zinc-800 pb-2">4. Zabezpečení a Role</h2>
          <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300">
            <p>
              Systém chrání citlivá data (nákupní ceny, dodavatele, marže). V budoucnu budou moci skladníci přistupovat do systému z mobilních telefonů (PWA aplikace pro skenování QR kódů do regálů). 
              Díky přísným rolím ale skladník nikdy neuvidí nákupní cenu z Číny, a obchodník nebude moci omylem smazat fyzický regál ze systému.
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}
