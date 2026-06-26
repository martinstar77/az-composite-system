export interface PortfolioGroup {
  nazev: string
  polozky: string[]
}

export type PortfolioPrunikStav = 'ano' | 'zajem' | 'zamereni' | null

export const PORTFOLIO_SKUPINY: PortfolioGroup[] = [
  {
    nazev: "Tkaniny — uhlíkové",
    polozky: ["Uhlíkové tkaniny", "Uhlíkové rohože"],
  },
  {
    nazev: "Tkaniny — ostatní",
    polozky: [
      "Skelné tkaniny",
      "Skelné rohože",
      "Aramidové tkaniny",
      "Hybridní tkaniny",
      "Lněné tkaniny",
      "Lněné rohože",
      "Konopné tkaniny"
    ],
  },
  {
    nazev: "Pryskyřice & pojiva",
    polozky: ["Polyester a vinylester", "Epoxidy"],
  },
  {
    nazev: "Jádrové materiály",
    polozky: ["Jádra"],
  },
  {
    nazev: "Vakuové systémy",
    polozky: [
      "Vakuové fólie",
      "Separační fólie",
      "Strhávací tkaniny",
      "Odsávací rohože",
      "Infuzní sítky",
      "KOMBI materiály",
      "Rozvodná média",
      "Těsnicí pásky",
      "Flash pásky",
      "PTFE pásky",
      "Adhezivní spreje",
      "Hadice rozvodné",
      "Vakuové rozvody"
    ],
  },
  {
    nazev: "Adheziva & čištění",
    polozky: [
      "Epoxidové lepidlo",
      "Čistič forem",
      "Vyhlazovací báze",
      "Plniče pórů",
      "Separátory",
      "Brusné/leštící pasty"
    ],
  },
  {
    nazev: "Ostatní",
    polozky: ["RST-5", "Spojovací materiál"],
  },
]
