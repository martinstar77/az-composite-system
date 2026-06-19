"use client"

import { useState, useEffect } from "react"
import { NotesSidebar } from "./NotesSidebar"
import { NoteEditor } from "./NoteEditor"
import { getFolders, getNotes } from "../actions"
import { Note, NoteFolder } from "../types"

export function NotesContainer() {
    const [folders, setFolders] = useState<NoteFolder[]>([])
    const [notes, setNotes] = useState<Note[]>([])
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null) // null = Všechny poznámky
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    // Load folders once on mount
    useEffect(() => {
        async function loadFolders() {
            const res = await getFolders()
            if (res.success) setFolders(res.data || [])
        }
        loadFolders()
    }, [])

    // Load notes whenever selected folder changes
    useEffect(() => {
        async function loadNotes() {
            setLoading(true)
            const res = await getNotes(selectedFolderId)
            if (res.success) {
                setNotes(res.data || [])
            }
            setLoading(false)
        }
        loadNotes()
    }, [selectedFolderId])

    const activeNote = notes.find(n => n.id === selectedNoteId)

    const handleRefreshFolders = async () => {
        const res = await getFolders()
        if (res.success) setFolders(res.data || [])
    }

    const handleRefreshNotes = async () => {
        const res = await getNotes(selectedFolderId)
        if (res.success) setNotes(res.data || [])
    }

    return (
        <div className="flex bg-background border border-border rounded-xl overflow-hidden h-[calc(100vh-10rem)] shadow-sm">
            {/* Sidebar (Folders & Note List) */}
            <NotesSidebar
                folders={folders}
                notes={notes}
                selectedFolderId={selectedFolderId}
                setSelectedFolderId={setSelectedFolderId}
                selectedNoteId={selectedNoteId}
                setSelectedNoteId={setSelectedNoteId}
                loading={loading}
                refreshFolders={handleRefreshFolders}
                refreshNotes={handleRefreshNotes}
            />

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden bg-card/25">
                <NoteEditor
                    note={activeNote}
                    refreshNotes={handleRefreshNotes}
                    setSelectedNoteId={setSelectedNoteId}
                />
            </div>
        </div>
    )
}
