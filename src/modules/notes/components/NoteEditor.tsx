"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/shared/components/ui/button"
import { Save, Trash2, Users, FileText, Loader2 } from "lucide-react"
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
    const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    // Refs to store current values for the fire-and-forget switch/unmount cleanup save
    const titleRef = useRef(title)
    const contentRef = useRef(content)
    const isSharedRef = useRef(isShared)
    const hasChangesRef = useRef(hasChanges)
    const noteRef = useRef(note)

    useEffect(() => {
        titleRef.current = title
        contentRef.current = content
        isSharedRef.current = isShared
        hasChangesRef.current = hasChanges
        noteRef.current = note
    }, [title, content, isShared, hasChanges, note])

    // Load active note details when it changes
    useEffect(() => {
        if (note) {
            setTitle(note.nazev)
            setContent(note.obsah || "")
            setIsShared(note.is_shared)
            setHasChanges(false)
            setSavingStatus('idle')
        }
    }, [note])

    // Helper to format payload and call upsertNote API
    const saveNoteData = async (
        noteId: string,
        currentTitle: string,
        currentContent: string,
        currentIsShared: boolean,
        folderId: string | null | undefined
    ) => {
        const contentText = currentContent
            .replace(/<[^>]*>/g, ' ') // strip html tags
            .replace(/\s+/g, ' ')     // collapse spacing
            .trim()
            .substring(0, 150)        // limit size

        return await upsertNote({
            title: currentTitle.trim() || "Bez názvu",
            content: currentContent,
            content_text: contentText,
            folder_id: folderId,
            is_shared: currentIsShared
        }, noteId)
    }

    const handleSave = async () => {
        if (!note) return
        setSavingStatus('saving')
        const res = await saveNoteData(note.id, title, content, isShared, note.slozka_id)
        if (res.success) {
            setHasChanges(false)
            setSavingStatus('saved')
            await refreshNotes()
        } else {
            setSavingStatus('error')
            toast.error(res.error || "Chyba při ukládání poznámky")
        }
    }

    // Auto-save debounced effect: triggers after 3000ms of typing inactivity
    useEffect(() => {
        if (!hasChanges || !note) return

        // Verify if we actually have different content than the original DB version
        if (title === note.nazev && content === (note.obsah || "") && isShared === note.is_shared) {
            setHasChanges(false)
            setSavingStatus('idle')
            return
        }

        setSavingStatus('saving')
        const timer = setTimeout(async () => {
            await handleSave()
        }, 3000)

        return () => clearTimeout(timer)
    }, [title, content, isShared, hasChanges, note?.id])

    // Safety net: Immediately save previous note changes on unmount or switch
    useEffect(() => {
        return () => {
            if (noteRef.current && hasChangesRef.current) {
                const prevNote = noteRef.current
                const prevTitle = titleRef.current
                const prevContent = contentRef.current
                const prevIsShared = isSharedRef.current

                saveNoteData(
                    prevNote.id,
                    prevTitle,
                    prevContent,
                    prevIsShared,
                    prevNote.slozka_id
                ).then((res) => {
                    if (res.success) {
                        refreshNotes()
                    }
                })
            }
        }
    }, [note?.id])

    if (!note) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 bg-zinc-950/10 dark:bg-black/5">
                <FileText className="h-12 w-12 opacity-20 text-muted-foreground" />
                <p className="text-sm italic">Vyberte poznámku ze seznamu nebo vytvořte novou</p>
            </div>
        )
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
                        onBlur={() => {
                            if (hasChanges && savingStatus !== 'saving') {
                                handleSave()
                            }
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

                    {/* Saving Status Indicator */}
                    <div className="flex items-center gap-2">
                        {savingStatus === 'saving' && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                Ukládání...
                            </span>
                        )}
                        {savingStatus === 'saved' && (
                            <span className="text-xs text-emerald-500/80 dark:text-emerald-400/80 flex items-center gap-1.5 bg-emerald-500/5 px-2.5 py-1 rounded-md border border-emerald-500/10">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Uloženo
                            </span>
                        )}
                        {savingStatus === 'error' && (
                            <span className="text-xs text-destructive flex items-center gap-1 bg-destructive/5 px-2.5 py-1 rounded-md border border-destructive/10">
                                Chyba ukládání
                            </span>
                        )}
                        {savingStatus === 'idle' && hasChanges && (
                            <span className="text-xs text-muted-foreground/60 flex items-center gap-1 px-2.5 py-1">
                                Neuložené změny
                            </span>
                        )}
                    </div>

                    <Button
                        size="sm"
                        className="h-9 px-4 animate-in fade-in duration-200"
                        onClick={handleSave}
                        disabled={savingStatus === 'saving' || !hasChanges}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Uložit
                    </Button>

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
            <div className="flex-1 overflow-hidden flex flex-col p-6 min-h-0">
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
                        onBlur={() => {
                            if (hasChangesRef.current && savingStatus !== 'saving') {
                                handleSave()
                            }
                        }}
                        placeholder="Napište něco sem..."
                        className="flex-1 border-none min-h-[400px]"
                    />
                </div>
            </div>
        </div>
    )
}
