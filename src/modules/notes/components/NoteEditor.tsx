"use client"

import { useState, useEffect } from "react"
import { Button } from "@/shared/components/ui/button"
import { Save, Trash2, Users, FileText } from "lucide-react"
import { upsertNote, deleteNote } from "../actions"
import { Note } from "../types"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"
import { RichTextEditor } from "./RichTextEditor"
import { Switch } from "@/shared/components/ui/switch"
import { Label } from "@/shared/components/ui/label"
import { Separator } from "@/shared/components/ui/separator"
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

interface NoteEditorProps {
    note: Note | undefined
    refreshNotes: () => Promise<void>
    setSelectedNoteId: (id: string | null) => void
}

export function NoteEditor({ note, refreshNotes, setSelectedNoteId }: NoteEditorProps) {
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [isShared, setIsShared] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (note) {
            setTitle(note.nazev)
            setContent(note.obsah || "")
            setIsShared(note.is_shared)
            setHasChanges(false)
        }
    }, [note])

    if (!note) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 bg-zinc-950/10 dark:bg-black/5">
                <FileText className="h-12 w-12 opacity-20 text-muted-foreground" />
                <p className="text-sm italic">Vyberte poznámku ze seznamu nebo vytvořte novou</p>
            </div>
        )
    }

    const handleSave = async () => {
        setSaving(true)
        // Extract text preview for search and listing
        const contentText = content
            .replace(/<[^>]*>/g, ' ') // strip html tags
            .replace(/\s+/g, ' ')     // collapse spacing
            .trim()
            .substring(0, 150)        // limit size

        const res = await upsertNote({
            title: title.trim() || "Bez názvu",
            content: content,
            content_text: contentText,
            folder_id: note.slozka_id,
            is_shared: isShared
        }, note.id)

        if (res.success) {
            toast.success("Poznámka byla uložena")
            setHasChanges(false)
            await refreshNotes()
        } else {
            toast.error(res.error || "Chyba při ukládání poznámky")
        }
        setSaving(false)
    }

    const handleDelete = async () => {
        const res = await deleteNote(note.id)
        if (res.success) {
            toast.success("Poznámka byla smazána")
            setSelectedNoteId(null)
            await refreshNotes()
        } else {
            toast.error(res.error || "Chyba při mazání poznámky")
        }
    }

    const createdDate = new Date(note.vytvoreno_at).toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
    
    const updatedDate = new Date(note.aktualizovano_at).toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Editor Toolbar Header */}
            <div className="h-16 border-b border-border px-6 flex items-center justify-between gap-4 shrink-0 bg-zinc-950/20 dark:bg-black/10 select-none">
                <div className="flex-1 flex items-center gap-4">
                    <input
                        className="bg-transparent border-none text-base font-bold text-foreground focus:outline-none w-full max-w-md placeholder:text-muted-foreground"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value)
                            setHasChanges(true)
                        }}
                        placeholder="Název poznámky..."
                    />
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    {/* Share Switch */}
                    <div className="flex items-center gap-2 border border-border px-3 py-1.5 rounded-lg bg-muted/40">
                        <Users className={cn("h-4 w-4", isShared ? "text-primary" : "text-muted-foreground")} />
                        <Label htmlFor="note-share" className="text-xs font-semibold cursor-pointer">Sdílet se všemi</Label>
                        <Switch
                            id="note-share"
                            checked={isShared}
                            onCheckedChange={(checked) => {
                                setIsShared(checked)
                                setHasChanges(true)
                            }}
                        />
                    </div>

                    <Separator orientation="vertical" className="h-8" />

                    {hasChanges && (
                        <Button
                            size="sm"
                            className="h-9 px-4"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Uložit
                        </Button>
                    )}

                    <AlertDialog>
                        <AlertDialogTrigger render={
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        } />
                        <AlertDialogContent className="bg-zinc-950 border border-border">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Smazat poznámku?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Opravdu chcete smazat poznámku "{title || "Bez názvu"}"? Tato akce je nevratná.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Smazat
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Note Editor Area */}
            <div className="flex-1 overflow-y-auto flex flex-col p-6 min-h-0">
                {/* Audit Block */}
                <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-muted-foreground border-b border-border/60 pb-3">
                    <div>
                        <span className="font-semibold text-primary">Vytvořil: </span>
                        <span>{note.vytvoril?.jmeno || "Systém"}</span>
                        <span className="opacity-80"> ({createdDate})</span>
                    </div>
                    {note.upravil && (
                        <div>
                            <span className="font-semibold text-foreground">Upravil: </span>
                            <span>{note.upravil.jmeno}</span>
                            <span className="opacity-80"> ({updatedDate})</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col min-h-[300px]">
                    <RichTextEditor
                        value={content}
                        onChange={(val) => {
                            setContent(val)
                            setHasChanges(true)
                        }}
                        placeholder="Napište něco sem..."
                        className="flex-1 border-none min-h-[400px]"
                    />
                </div>
            </div>
        </div>
    )
}
