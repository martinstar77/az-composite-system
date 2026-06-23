"use client"

import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Color } from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"
import { Underline } from "@tiptap/extension-underline"
import { Placeholder } from "@tiptap/extension-placeholder"
import { TextAlign } from "@tiptap/extension-text-align"
import { Highlight } from "@tiptap/extension-highlight"
import { Link } from "@tiptap/extension-link"
import { TaskList } from "@tiptap/extension-task-list"
import { TaskItem } from "@tiptap/extension-task-item"
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Highlighter,
    Type,
    Undo,
    Redo,
    CheckSquare
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/shared/components/ui/popover"
import { cn } from "@/shared/lib/utils"

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    onBlur?: () => void
    placeholder?: string
    className?: string
    editable?: boolean
    showToolbar?: boolean
}

export function RichTextEditor({
    value,
    onChange,
    onBlur,
    placeholder,
    className,
    editable = true,
    showToolbar = true
}: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        editable,
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            Link.configure({
                openOnClick: false,
            }),
            Placeholder.configure({
                placeholder: placeholder || "Začněte psát...",
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        onBlur: () => {
            if (onBlur) onBlur()
        },
    })

    // Update editor's editable state if prop changes
    React.useEffect(() => {
        if (editor && editor.isEditable !== editable) {
            editor.setEditable(editable)
        }
    }, [editor, editable])

    // Update editor's content if value prop changes
    React.useEffect(() => {
        if (!editor) return

        const currentHTML = editor.getHTML()
        if (value !== currentHTML && !editor.isFocused) {
            editor.commands.setContent(value, false as any)
        }
    }, [editor, value])

    if (!editor) {
        return (
            <div className={cn(
                "flex flex-col rounded-md bg-background overflow-hidden transition-all border-none min-h-[150px]",
                className
            )}>
                <div className="flex h-full items-center justify-center text-muted-foreground animate-pulse">
                    Načítání editoru...
                </div>
            </div>
        )
    }

    const colors = [
        { name: "Výchozí", color: "inherit" },
        { name: "Fialová (Brand)", color: "var(--primary)" },
        { name: "Zelená", color: "#10b981" },
        { name: "Modrá", color: "#3b82f6" },
        { name: "Červená", color: "#ef4444" },
        { name: "Žlutá", color: "#f59e0b" },
        { name: "Bílá", color: "#ffffff" },
        { name: "Šedá", color: "#9ca3af" },
    ]

    const highlights = [
        { name: "Bez zvýraznění", color: "transparent" },
        { name: "Žluté", color: "#fef08a" },
        { name: "Zelené", color: "#bbf7d0" },
        { name: "Modré", color: "#bfdbfe" },
        { name: "Červené", color: "#fecaca" },
        { name: "Fialové", color: "#e9d5ff" },
    ]

    return (
        <div className={cn(
            "flex flex-col rounded-md bg-background overflow-hidden transition-all",
            editable || showToolbar ? "border border-border flex-1" : "border-none",
            className
        )}>
            {showToolbar && (
                <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-900/50 border-b border-border">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 w-8 p-0", editor.isActive("bold") && "bg-muted")}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        type="button"
                        title="Tučně"
                    >
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 w-8 p-0", editor.isActive("italic") && "bg-muted")}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        type="button"
                        title="Kurzíva"
                    >
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 w-8 p-0", editor.isActive("underline") && "bg-muted")}
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        type="button"
                        title="Podtržené"
                    >
                        <UnderlineIcon className="h-4 w-4" />
                    </Button>

                    <Separator orientation="vertical" className="h-6 mx-1" />

                    <Popover>
                        <PopoverTrigger render={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" type="button" title="Barva textu">
                                <Type className="h-4 w-4" />
                            </Button>
                        } />
                        <PopoverContent className="w-40 p-2 bg-zinc-950 border border-border" align="start">
                            <div className="grid grid-cols-4 gap-1">
                                {colors.map((c) => (
                                    <button
                                        key={c.color}
                                        type="button"
                                        className="w-7 h-7 rounded border border-border hover:scale-110 transition-transform"
                                        style={{ backgroundColor: c.color === "inherit" ? "transparent" : c.color }}
                                        onClick={() => editor.chain().focus().setColor(c.color).run()}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Popover>
                        <PopoverTrigger render={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" type="button" title="Zvýraznění textu">
                                <Highlighter className="h-4 w-4" />
                            </Button>
                        } />
                        <PopoverContent className="w-40 p-2 bg-zinc-950 border border-border" align="start">
                            <div className="grid grid-cols-3 gap-1">
                                {highlights.map((h) => (
                                    <button
                                        key={h.color}
                                        type="button"
                                        className="w-8 h-8 rounded border border-border hover:scale-110 transition-transform"
                                        style={{ backgroundColor: h.color }}
                                        onClick={() => editor.chain().focus().toggleHighlight({ color: h.color }).run()}
                                        title={h.name}
                                    />
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Separator orientation="vertical" className="h-6 mx-1" />

                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 w-8 p-0", editor.isActive("bulletList") && "bg-muted")}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        type="button"
                        title="Odrážkový seznam"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 w-8 p-0", editor.isActive("orderedList") && "bg-muted")}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        type="button"
                        title="Číselný seznam"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 w-8 p-0", editor.isActive("taskList") && "bg-muted")}
                        onClick={() => editor.chain().focus().toggleTaskList().run()}
                        title="Checklist"
                        type="button"
                    >
                        <CheckSquare className="h-4 w-4" />
                    </Button>

                    <Separator orientation="vertical" className="h-6 mx-1" />

                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: "left" }) && "bg-muted")}
                        onClick={() => editor.chain().focus().setTextAlign("left").run()}
                        type="button"
                        title="Zarovnat doleva"
                    >
                        <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: "center" }) && "bg-muted")}
                        onClick={() => editor.chain().focus().setTextAlign("center").run()}
                        type="button"
                        title="Zarovnat na střed"
                    >
                        <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: "right" }) && "bg-muted")}
                        onClick={() => editor.chain().focus().setTextAlign("right").run()}
                        type="button"
                        title="Zarovnat doprava"
                    >
                        <AlignRight className="h-4 w-4" />
                    </Button>

                    <div className="flex-1" />

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        type="button"
                        title="Zpět"
                    >
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        type="button"
                        title="Znovu"
                    >
                        <Redo className="h-4 w-4" />
                    </Button>
                </div>
            )}
            <EditorContent
                editor={editor}
                className={cn(
                    "prose prose-sm dark:prose-invert max-w-none focus:outline-none tiptap-editor-content flex-1 overflow-y-auto",
                    editable ? "p-4 min-h-[250px]" : "p-0 min-h-0"
                )}
            />
        </div>
    )
}
