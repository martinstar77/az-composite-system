import { Metadata } from "next"
import { NotesContainer } from "@/modules/notes/components/NotesContainer"

export const metadata: Metadata = {
  title: "Poznámkový blok | AZ Composite",
  description: "Osobní a sdílené poznámky ERP systému AZ Composite.",
}

export default function NotesPage() {
  return (
    <div className="w-full pb-10 flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Poznámkový blok</h1>
        <p className="text-muted-foreground mt-1 text-sm">Osobní a sdílené poznámky celého týmu.</p>
      </div>

      <NotesContainer />
    </div>
  )
}
