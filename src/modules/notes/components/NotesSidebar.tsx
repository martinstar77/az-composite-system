"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Plus, Folder, FileText, Trash2, Edit, Users, Globe } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { upsertFolder, deleteFolder, upsertNote } from "../actions"
import { Note, NoteFolder } from "../types"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog"
import { Switch } from "@/shared/components/ui/switch"
import { Label } from "@/shared/components/ui/label"

interface NotesSidebarProps {
    folders: NoteFolder[]
    notes: Note[]
    selectedFolderId: string | null
    setSelectedFolderId: (id: string | null) => void
    selectedNoteId: string | null
    setSelectedNoteId: (id: string | null) => void
    loading: boolean
    refreshFolders: () => Promise<void>
    refreshNotes: () => Promise<void>
}

export function NotesSidebar({
    folders,
    notes,
    selectedFolderId,
    setSelectedFolderId,
    selectedNoteId,
    setSelectedNoteId,
    loading,
    refreshFolders,
    refreshNotes
}: NotesSidebarProps) {
    const [isCreatingFolder, setIsCreatingFolder] = useState(false)
    const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null)
    const [newFolderName, setNewFolderName] = useState("")
    const [selectedColor, setSelectedColor] = useState("text-blue-500")
    const [isSharedFolder, setIsSharedFolder] = useState(false)

    const folderColors = [
        { text: "text-blue-500", bg: "bg-blue-500" },
        { text: "text-emerald-500", bg: "bg-emerald-500" },
        { text: "text-amber-500", bg: "bg-amber-500" },
        { text: "text-rose-500", bg: "bg-rose-500" },
        { text: "text-violet-500", bg: "bg-violet-500" },
        { text: "text-orange-500", bg: "bg-orange-500" },
        { text: "text-teal-500", bg: "bg-teal-500" },
        { text: "text-fuchsia-500", bg: "bg-fuchsia-500" }
    ]

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return
        const res = await upsertFolder(
            { 
                name: newFolderName, 
                color: selectedColor, 
                is_shared: isSharedFolder 
            },
            editingFolder?.id
        )
        if (res.success) {
            toast.success("Složka byla úspěšně uložena")
            setNewFolderName("")
            setIsSharedFolder(false)
            setIsCreatingFolder(false)
            setEditingFolder(null)
            await refreshFolders()
        } else {
            toast.error(res.error || "Chyba při ukládání složky")
        }
    }

    const handleCreateNote = async () => {
        // Find if selected folder is shared, so note inherits it
        const currentFolder = folders.find(f => f.id === selectedFolderId)
        const isShared = currentFolder ? currentFolder.is_shared : false

        const res = await upsertNote({
            title: "Bez názvu",
            folder_id: selectedFolderId,
            is_shared: isShared
        })
        if (res.success && res.data) {
            toast.success("Poznámka vytvořena")
            await refreshNotes()
            setSelectedNoteId(res.data.id)
        } else {
            toast.error(res.error || "Chyba při vytváření poznámky")
        }
    }

    const startEditFolder = (folder: NoteFolder) => {
        setEditingFolder(folder)
        setNewFolderName(folder.nazev)
        setSelectedColor(folder.barva || "text-blue-500")
        setIsSharedFolder(folder.is_shared)
        setIsCreatingFolder(true)
    }

    return (
        <div className="w-80 border-r border-border flex h-full select-none">
            {/* Folder Column */}
            <div className="w-24 border-r border-border py-4 flex flex-col items-center space-y-4 bg-zinc-950/20 dark:bg-black/10">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Složky</div>
                
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={() => {
                        setEditingFolder(null)
                        setNewFolderName("")
                        setIsSharedFolder(false)
                        setSelectedColor("text-blue-500")
                        setIsCreatingFolder(true)
                    }}
                    title="Nová složka"
                >
                    <Plus className="h-5 w-5" />
                </Button>

                <TooltipProvider>
                    <div className="w-full flex-1 overflow-y-auto px-2 space-y-2">
                        <Tooltip>
                            <TooltipTrigger render={
                                <button
                                    onClick={() => setSelectedFolderId(null)}
                                    className={cn(
                                        "h-12 w-full rounded-xl flex items-center justify-center transition-all",
                                        selectedFolderId === null ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                />
                            } />
                            <TooltipContent side="right" className="bg-zinc-950 border border-border text-foreground text-xs py-1.5 px-3">
                                Všechny poznámky
                            </TooltipContent>
                        </Tooltip>

                        {folders.map((folder) => {
                            const colorClass = folder.barva || "text-blue-500"
                            const isShared = folder.is_shared

                            return (
                                <div key={folder.id} className="relative group w-full">
                                    <Tooltip>
                                        <TooltipTrigger render={
                                            <button
                                                onClick={() => setSelectedFolderId(folder.id)}
                                                className={cn(
                                                    "h-16 w-full rounded-xl flex flex-col items-center justify-center transition-all gap-1 px-1",
                                                    selectedFolderId === folder.id
                                                        ? "bg-primary text-primary-foreground"
                                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                )}
                                            />
                                        } />
                                        <TooltipContent side="right" className="bg-zinc-950 border border-border text-foreground text-xs py-1.5 px-3 max-w-xs">
                                            <div className="font-semibold">{folder.nazev}</div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                                {isShared ? "Sdílená složka" : "Osobní složka"}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>

                                    {/* Folder Icon Overlay (Folder or Shared Users) */}
                                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-1">
                                        {isShared ? (
                                            <Users className={cn("h-5 w-5", selectedFolderId === folder.id ? "text-primary-foreground" : colorClass)} />
                                        ) : (
                                            <Folder className={cn("h-5 w-5", selectedFolderId === folder.id ? "text-primary-foreground" : colorClass)} />
                                        )}
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase tracking-tighter line-clamp-1 px-1",
                                            selectedFolderId === folder.id ? "text-primary-foreground" : "text-muted-foreground"
                                        )}>
                                            {folder.nazev}
                                        </span>
                                    </div>

                                    {/* Options on Hover */}
                                    <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10 p-0.5 bg-zinc-950/60 dark:bg-black/60 rounded-md">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                startEditFolder(folder)
                                            }}
                                            className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                                            title="Upravit složku"
                                        >
                                            <Edit className="h-2.5 w-2.5" />
                                        </button>
                                        <AlertDialog>
                                            <AlertDialogTrigger render={
                                                <button
                                                    className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                                                    title="Smazat složku"
                                                >
                                                    <Trash2 className="h-2.5 w-2.5" />
                                                </button>
                                            } />
                                            <AlertDialogContent className="bg-zinc-950 border border-border">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Odstranit složku?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Tato akce přesune složku "{folder.nazev}" do koše. Poznámky uvnitř složky zůstanou zachovány, ale nebudou zařazené v žádné složce.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={async () => {
                                                            const res = await deleteFolder(folder.id)
                                                            if (res.success) {
                                                                if (selectedFolderId === folder.id) setSelectedFolderId(null)
                                                                await refreshFolders()
                                                            } else {
                                                                toast.error(res.error || "Chyba při mazání složky")
                                                            }
                                                        }}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Smazat
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </TooltipProvider>
            </div>

            {/* Note List Column */}
            <div className="flex-1 flex flex-col bg-zinc-950/40 dark:bg-black/20">
                <div className="p-4 flex items-center justify-between border-b border-border h-16">
                    <h3 className="font-bold text-sm tracking-tight text-foreground">Poznámky</h3>
                    <Button
                        size="sm"
                        className="h-8 px-2 text-xs rounded-lg"
                        onClick={handleCreateNote}
                    >
                        Nová poznámka
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {notes.length === 0 && !loading && (
                        <div className="py-20 text-center text-muted-foreground text-xs italic">
                            Žádné poznámky
                        </div>
                    )}
                    {notes.map(note => (
                        <button
                            key={note.id}
                            onClick={() => setSelectedNoteId(note.id)}
                            className={cn(
                                "w-full text-left p-4 rounded-xl transition-all duration-300 border group block relative",
                                selectedNoteId === note.id
                                    ? "bg-muted border-border text-foreground shadow-sm translate-x-1"
                                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                        >
                            <div className="font-bold text-sm line-clamp-1 mb-1 pr-4">{note.nazev || "Bez názvu"}</div>
                            
                            <div className="text-[10px] opacity-60 mb-2">
                                {new Date(note.aktualizovano_at).toLocaleDateString('cs-CZ', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>

                            <div className="text-xs line-clamp-2 mb-2 text-muted-foreground font-normal">
                                {note.obsah_txt || <span className="italic opacity-60">Prázdný obsah...</span>}
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                                {note.is_shared ? (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-semibold uppercase tracking-tight">
                                        <Users className="h-2.5 w-2.5" />
                                        Sdílená
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 text-muted-foreground text-[9px] font-semibold uppercase tracking-tight">
                                        Osobní
                                    </div>
                                )}
                                {note.upravil && (
                                    <div className="text-[9px] text-zinc-500 font-mono">
                                        {note.upravil.jmeno}
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Create / Edit Folder Modal Overlay */}
            {isCreatingFolder && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 text-foreground">
                    <div className="bg-zinc-950 border border-border p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                        <h4 className="text-sm font-bold mb-4">
                            {editingFolder ? "Upravit složku" : "Nová složka"}
                        </h4>
                        
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="folder-name" className="text-xs font-bold text-muted-foreground mb-1 block">Název složky</Label>
                                <input
                                    id="folder-name"
                                    autoFocus
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                                    placeholder="Napište název..."
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                />
                            </div>

                            {/* Share Toggle */}
                            <div className="flex items-center justify-between border border-border p-3 rounded-xl bg-zinc-900/40">
                                <div className="space-y-0.5">
                                    <Label htmlFor="folder-share" className="text-xs font-bold text-foreground">Sdílet se všemi</Label>
                                    <p className="text-[10px] text-muted-foreground">Všichni uživatelé budou moci složku vidět i měnit.</p>
                                </div>
                                <Switch
                                    id="folder-share"
                                    checked={isSharedFolder}
                                    onCheckedChange={setIsSharedFolder}
                                />
                            </div>

                            {/* Colors */}
                            <div>
                                <Label className="text-xs font-bold text-muted-foreground mb-2 block">Barevné označení</Label>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {folderColors.map(item => (
                                        <button
                                            key={item.text}
                                            type="button"
                                            onClick={() => setSelectedColor(item.text)}
                                            className={cn(
                                                "h-6 w-6 rounded-full border-2 transition-all cursor-pointer",
                                                item.bg,
                                                selectedColor === item.text ? "border-foreground scale-110 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => {
                                    setIsCreatingFolder(false)
                                    setEditingFolder(null)
                                    setNewFolderName("")
                                    setIsSharedFolder(false)
                                }}>Zrušit</Button>
                                <Button className="flex-1 rounded-xl" onClick={handleCreateFolder}>
                                    {editingFolder ? "Uložit" : "Vytvořit"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
