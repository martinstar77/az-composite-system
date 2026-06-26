"use client"

import * as React from "react"
import { useState, useEffect, useRef, useTransition } from "react"
import { toast } from "sonner"
import { 
  Play, 
  Square as StopIcon, 
  Plus, 
  Trash2, 
  Sparkles, 
  Save, 
  Clock, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  User, 
  ListTodo, 
  FileText, 
  BookOpen 
} from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Badge } from "@/shared/components/ui/badge"
import { Separator } from "@/shared/components/ui/separator"
import { RichTextEditor } from "@/modules/notes/components/RichTextEditor"
import { UdalostPlanovani, AgendaTopic, ODDELENI_CONFIG } from "../types"
import { upsertUdalost, generateMeetingOutputViaAI, getTasksByMeeting } from "../actions/udalosti"

interface MeetingWorkspaceProps {
  meeting: UdalostPlanovani
  userProfiles: { id: string; jmeno: string }[]
  onSuccess?: () => void
  trigger: React.ReactElement
}

export function MeetingWorkspace({ meeting, userProfiles, onSuccess, trigger }: MeetingWorkspaceProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<"agenda" | "notes" | "outputs">("agenda")

  // Workspace Local States
  const [agenda, setAgenda] = useState<AgendaTopic[]>(meeting.agenda || [])
  const [zapis, setZapis] = useState(meeting.zapis || "")
  const [createdTasks, setCreatedTasks] = useState<any[]>([])
  const [newTopicName, setNewTopicName] = useState("")
  
  // Timer States
  const [isMeetingActive, setIsMeetingActive] = useState(false)
  const [meetingSeconds, setMeetingSeconds] = useState(0)
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null)
  const [topicSeconds, setTopicSeconds] = useState(0)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync state with meeting prop when opened
  useEffect(() => {
    if (open) {
      setAgenda(meeting.agenda || [])
      setZapis(meeting.zapis || "")
      setIsMeetingActive(false)
      setMeetingSeconds(0)
      setActiveTopicId(null)
      setTopicSeconds(0)
      
      // Load action tasks created from this meeting
      getTasksByMeeting(meeting.id).then(res => {
        if (res.success && res.data) {
          setCreatedTasks(res.data)
        }
      })
    }
  }, [open, meeting])

  // Meeting Timer Effect
  useEffect(() => {
    if (isMeetingActive) {
      timerRef.current = setInterval(() => {
        setMeetingSeconds(s => s + 1)
        if (activeTopicId) {
          setTopicSeconds(s => s + 1)
        }
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isMeetingActive, activeTopicId])

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Agenda Management Handlers
  const handleAddTopic = () => {
    if (!newTopicName.trim()) return
    const newTopic: AgendaTopic = {
      id: crypto.randomUUID(),
      nazev: newTopicName.trim(),
      popis: "",
      prezentuje_id: meeting.organizator_id || null,
      doba_minut: 10,
      stav: "planned"
    }
    setAgenda([...agenda, newTopic])
    setNewTopicName("")
  }

  const handleRemoveTopic = (id: string) => {
    setAgenda(agenda.filter(t => t.id !== id))
    if (activeTopicId === id) {
      setActiveTopicId(null)
      setTopicSeconds(0)
    }
  }

  const handleUpdateTopic = (id: string, updates: Partial<AgendaTopic>) => {
    setAgenda(agenda.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const handleToggleTopicDiscussed = (id: string, currentStav: "planned" | "discussed") => {
    const nextStav = currentStav === "planned" ? "discussed" : "planned"
    handleUpdateTopic(id, { stav: nextStav })
    if (activeTopicId === id && nextStav === "discussed") {
      // Find next planned topic to activate
      const currentIdx = agenda.findIndex(t => t.id === id)
      const nextPlanned = agenda.slice(currentIdx + 1).find(t => t.stav === "planned")
      if (nextPlanned) {
        setActiveTopicId(nextPlanned.id)
        setTopicSeconds(0)
      } else {
        setActiveTopicId(null)
      }
    }
  }

  // Start / Stop Meeting Mode
  const handleStartMeeting = () => {
    setIsMeetingActive(true)
    setActiveTab("notes")
    // Find first planned topic
    const firstPlanned = agenda.find(t => t.stav === "planned")
    if (firstPlanned) {
      setActiveTopicId(firstPlanned.id)
      setTopicSeconds(0)
    }
  }

  const handleStopMeeting = () => {
    setIsMeetingActive(false)
    setActiveTopicId(null)
    handleSaveMeeting()
  }

  // Save changes locally to database
  const handleSaveMeeting = async () => {
    startTransition(async () => {
      const result = await upsertUdalost({
        ...meeting,
        agenda,
        zapis
      }, meeting.id)

      if (result.success) {
        toast.success("Meeting uložen do systému")
        onSuccess?.()
      } else {
        toast.error("Chyba při ukládání schůzky", { description: result.error })
      }
    })
  }

  // AI MAGIC: Generate Meeting notes and Action items
  const handleGenerateAI = () => {
    if (!zapis.trim()) {
      toast.error("Zápis ze schůzky je prázdný. Nejprve napište poznámky.")
      return
    }

    toast.info("Gemini analyzuje poznámky ze schůzky...", {
      description: "Generujeme zkrácený zápis a zakládáme akční úkoly v DB."
    })

    startTransition(async () => {
      // Save local state first
      await upsertUdalost({ ...meeting, agenda, zapis }, meeting.id)
      
      const result = await generateMeetingOutputViaAI(meeting.id)
      if (result.success && result.data) {
        setZapis(result.data.summary)
        setCreatedTasks(result.data.createdTasks)
        setActiveTab("outputs")
        
        const count = result.data.createdTasks.length
        toast.success("AI zpracování schůzky dokončeno!", {
          description: `Zápis byl zformátován a v DB bylo založeno ${count} akčních úkolů.`,
          duration: 6000
        })
        onSuccess?.()
      } else {
        toast.error("Chyba při AI zpracování", { description: result.error })
      }
    })
  }

  const activeTopic = agenda.find(t => t.id === activeTopicId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-7xl w-[96vw] h-[92vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-white">
        
        {/* Workspace Top Header Bar */}
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              <DialogTitle className="text-lg font-bold text-white truncate max-w-lg md:max-w-2xl">
                {meeting.nazev}
              </DialogTitle>
              <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/5">
                Schůzka
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              Datum: {meeting.datum_zahajeni ? new Date(meeting.datum_zahajeni).toLocaleDateString('cs-CZ') : "Nespecifikováno"}
              {meeting.lokalita && ` · Místo: ${meeting.lokalita}`}
            </p>
          </div>

          {/* Meeting Mode Action Center */}
          <div className="flex items-center gap-3">
            {isMeetingActive ? (
              <div className="flex items-center gap-3 bg-red-950/20 border border-red-500/20 px-3 py-1.5 rounded-lg">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="font-mono text-sm font-semibold text-red-400">
                  Schůzka: {formatTimer(meetingSeconds)}
                </span>
                {activeTopic && (
                  <span className="text-xs text-zinc-500 font-mono hidden md:inline">
                    ({activeTopic.nazev}: {formatTimer(topicSeconds)} / {activeTopic.doba_minut}:00)
                  </span>
                )}
                <Button 
                  onClick={handleStopMeeting} 
                  variant="destructive" 
                  size="sm" 
                  className="h-8 gap-1 font-semibold text-xs"
                >
                  <StopIcon className="h-3.5 w-3.5 fill-current" /> Ukončit schůzku
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleStartMeeting} 
                variant="outline" 
                size="sm" 
                className="h-9 gap-1.5 font-semibold text-xs border-purple-500/30 hover:bg-purple-500/10 text-purple-400"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Spustit meeting
              </Button>
            )}

            <Button
              onClick={handleSaveMeeting}
              disabled={isPending}
              variant="outline"
              size="sm"
              className="h-9 border-zinc-800 bg-zinc-900 hover:bg-zinc-850 gap-1.5 text-xs text-zinc-300"
            >
              <Save className="h-3.5 w-3.5" /> Uložit stav
            </Button>
          </div>
        </div>

        {/* Workspace Layout Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar Navigation & Tabs */}
          <div className="w-56 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between p-3 shrink-0">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-2">Sekce</span>
              <button
                onClick={() => setActiveTab("agenda")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === "agenda" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                }`}
              >
                <ListTodo className="h-4 w-4" />
                Témata & Agenda
                {agenda.length > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-zinc-800 text-zinc-400 h-5 px-1.5 text-[10px]">
                    {agenda.filter(t => t.stav === "discussed").length}/{agenda.length}
                  </Badge>
                )}
              </button>

              <button
                onClick={() => setActiveTab("notes")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === "notes" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                }`}
              >
                <FileText className="h-4 w-4" />
                Poznámky & Zápis
              </button>

              <button
                onClick={() => setActiveTab("outputs")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === "outputs" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Výstupy & AI
              </button>
            </div>

            {/* AI Generator Button in Sidebar Footer */}
            <div className="pt-4 border-t border-zinc-900">
              <Button
                onClick={handleGenerateAI}
                disabled={isPending || !zapis.trim()}
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white gap-2 font-bold shadow-lg shadow-purple-500/10"
              >
                <Sparkles className="h-4 w-4 fill-current animate-pulse text-yellow-300" />
                <span>AI Analýza & Zápis</span>
              </Button>
            </div>
          </div>

          {/* Central Workspace Canvas */}
          <div className="flex-1 bg-zinc-950 flex flex-col overflow-hidden">
            
            {/* TEMA A AGENDA TAB */}
            {activeTab === "agenda" && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Program a témata schůzky</h3>
                    <p className="text-xs text-zinc-400">Připravte si body schůzky, které chcete postupně probrat.</p>
                  </div>
                  
                  {/* Celkový čas agendy */}
                  <div className="flex items-center gap-1.5 text-zinc-400 text-xs bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-850">
                    <Clock className="h-4 w-4 text-purple-400" />
                    Celkový plánovaný čas: <strong className="text-white font-mono">{agenda.reduce((acc, t) => acc + t.doba_minut, 0)} min</strong>
                  </div>
                </div>

                {/* Add Agenda Topic Input Bar */}
                <div className="flex gap-2 mb-6 max-w-2xl">
                  <Input
                    placeholder="Např. Vyřešení logistiky vzorků pryskyřic..."
                    value={newTopicName}
                    onChange={e => setNewTopicName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddTopic()}
                    className="bg-zinc-900 border-zinc-800 h-10 text-sm text-white focus:border-purple-500"
                  />
                  <Button 
                    onClick={handleAddTopic}
                    className="bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 h-10 px-4 gap-1 text-xs font-semibold"
                  >
                    <Plus className="h-4 w-4" /> Přidat téma
                  </Button>
                </div>

                {/* Topics List Scroll Area */}
                <div className="flex-1 overflow-y-auto border border-zinc-850 bg-zinc-900/10 rounded-xl p-4">
                  {agenda.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 gap-3">
                      <ListTodo className="h-10 w-10 text-zinc-700" />
                      <p className="text-sm font-semibold">Tato schůzka zatím nemá žádná témata.</p>
                      <p className="text-xs text-zinc-600 max-w-sm">Zadejte první téma výše k naplánování agendy schůzky.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {agenda.map((topic, index) => {
                        const presenter = userProfiles.find(p => p.id === topic.prezentuje_id)
                        const isDiscussed = topic.stav === "discussed"

                        return (
                          <div 
                            key={topic.id}
                            className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-zinc-900 border rounded-lg transition-colors ${
                              isDiscussed ? "border-zinc-850/50 bg-zinc-900/30 opacity-60" : "border-zinc-850 hover:border-zinc-800"
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <button
                                onClick={() => handleToggleTopicDiscussed(topic.id, topic.stav)}
                                className="text-zinc-500 hover:text-purple-400 transition-colors shrink-0"
                              >
                                {isDiscussed ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/10" />
                                ) : (
                                  <Circle className="h-5 w-5" />
                                )}
                              </button>
                              
                              <div className="flex flex-col min-w-0">
                                <span className={`text-sm font-semibold text-white ${isDiscussed ? "line-through text-zinc-500" : ""}`}>
                                  {index + 1}. {topic.nazev}
                                </span>
                                <input
                                  placeholder="Přidat krátký popis nebo podklady..."
                                  value={topic.popis || ""}
                                  onChange={e => handleUpdateTopic(topic.id, { popis: e.target.value })}
                                  className="bg-transparent border-none text-[11px] text-zinc-400 mt-0.5 w-full focus:outline-none placeholder-zinc-600 focus:text-zinc-200"
                                />
                              </div>
                            </div>

                            {/* Presenter & Duration Controls */}
                            <div className="flex items-center gap-3 shrink-0 justify-end">
                              {/* Presenter Select */}
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-zinc-500" />
                                <Select
                                  value={topic.prezentuje_id || ""}
                                  onValueChange={val => handleUpdateTopic(topic.id, { prezentuje_id: val || null })}
                                >
                                  <SelectTrigger className="w-36 h-8 text-xs bg-zinc-950 border-zinc-850 text-zinc-400">
                                    <SelectValue placeholder="Kdo prezentuje" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Bez prezentujícího</SelectItem>
                                    {userProfiles.map(p => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.jmeno}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Duration Input */}
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={topic.doba_minut}
                                  onChange={e => handleUpdateTopic(topic.id, { doba_minut: parseInt(e.target.value) || 0 })}
                                  className="w-12 h-8 text-center text-xs bg-zinc-950 border-zinc-850 font-mono text-zinc-300"
                                  min="1"
                                />
                                <span className="text-[10px] text-zinc-500 font-mono">min</span>
                              </div>

                              {/* Trash/Remove */}
                              <Button
                                onClick={() => handleRemoveTopic(topic.id)}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-500 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* POZNAMKY A ZAPIS TAB */}
            {activeTab === "notes" && (
              <div className="flex-1 flex overflow-hidden">
                
                {/* Agenda Sidebar (During Meeting view) */}
                <div className="w-80 bg-zinc-900/30 border-r border-zinc-850 flex flex-col p-4 shrink-0 overflow-hidden">
                  <div className="flex flex-col gap-1 mb-3 shrink-0">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Přehled témat</span>
                    <h4 className="text-xs text-zinc-400 font-medium">Klikněte na téma pro spuštění jeho časomíry.</h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    <div className="space-y-2 pr-2">
                      {agenda.map((topic) => {
                        const isActive = activeTopicId === topic.id
                        const isDiscussed = topic.stav === "discussed"

                        return (
                          <div 
                            key={topic.id}
                            onClick={() => {
                              if (isMeetingActive && topic.stav === "planned") {
                                setActiveTopicId(topic.id)
                                setTopicSeconds(0)
                              }
                            }}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                              isActive
                                ? "bg-purple-500/10 border-purple-500/40 text-white font-semibold"
                                : isDiscussed
                                ? "bg-zinc-900/30 border-zinc-850/50 text-zinc-500 opacity-60"
                                : "bg-zinc-900/60 border-zinc-850 text-zinc-300 hover:border-zinc-800"
                            }`}
                          >
                            <span className="text-xs truncate">{topic.nazev}</span>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isActive ? (
                                <Badge variant="secondary" className="bg-red-500 text-white font-mono text-[9px] h-4.5 animate-pulse">
                                  {formatTimer(topicSeconds)}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  {topic.doba_minut}m
                                </span>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleTopicDiscussed(topic.id, topic.stav)
                                }}
                                className="text-zinc-500 hover:text-purple-400 transition-colors"
                              >
                                {isDiscussed ? (
                                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Circle className="h-4.5 w-4.5 shrink-0" />
                                )}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Rich Text Notes Editor */}
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                  <div className="flex justify-between items-center mb-2 shrink-0">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Surový zápis schůzky</span>
                    <span className="text-[10px] text-zinc-600">Tip: Zapište klíčové body, na konci Gemini vygeneruje čistý zápis.</span>
                  </div>

                  <div className="flex-1 border border-zinc-800 bg-zinc-900/20 rounded-xl overflow-hidden flex flex-col">
                    <RichTextEditor
                      value={zapis}
                      onChange={setZapis}
                      placeholder="Sem zapište vše, co zaznělo, schválené body, úkoly, dohody a nápady..."
                      className="border-none min-h-full"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* VYSTUPY A AI TAB */}
            {activeTab === "outputs" && (
              <div className="flex-1 flex overflow-hidden p-6 gap-6">
                
                {/* Left side: Beautiful Markdown AI Output */}
                <div className="flex-1 flex flex-col border border-zinc-800 bg-zinc-900/20 rounded-xl p-4 overflow-hidden">
                  <div className="flex justify-between items-center mb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-400 fill-purple-400" />
                      <span className="text-xs font-bold text-white">Strukturovaný zápis z meetingu</span>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 h-5 text-[9px]">
                      Zápis od AI
                    </Badge>
                  </div>

                  <div className="flex-1 overflow-y-auto prose prose-sm dark:prose-invert max-w-none bg-zinc-950/20 border border-zinc-850 p-4 rounded-lg select-text select-none">
                    {zapis ? (
                      <div className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                        {zapis}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-xs italic">Zatím žádný zápis schůzky. Přejděte na záložku Poznámky.</p>
                    )}
                  </div>
                </div>

                {/* Right side: List of action tasks */}
                <div className="w-[450px] flex flex-col border border-zinc-800 bg-zinc-900/20 rounded-xl p-4 overflow-hidden shrink-0">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <span className="text-xs font-bold text-white">Vazební akční kroky (ERP Úkoly)</span>
                    <Badge variant="outline" className="border-zinc-800 text-zinc-400 bg-zinc-900 h-5 text-[9px]">
                      Přiřazené úkoly
                    </Badge>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-zinc-950/20 border border-zinc-850 p-3 rounded-lg">
                    {createdTasks.length === 0 ? (
                      <div className="text-zinc-500 text-xs italic text-center py-6">
                        Zde se automaticky zobrazí úkoly, které Gemini zanalyzuje a založí do DB na základě vašeho zápisu ze schůzky.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {createdTasks.map((t) => (
                          <div key={t.id} className="p-3 bg-zinc-900 border border-zinc-850 rounded-lg flex items-center justify-between">
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-zinc-300">{t.nazev}</p>
                              <p className="text-[10px] text-zinc-500">
                                Vlastník: {t.vlastnik?.jmeno || "Nepřiřazeno"} 
                                {t.datum_splatnosti && ` · Termín: ${new Date(t.datum_splatnosti).toLocaleDateString('cs-CZ')}`}
                              </p>
                            </div>
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0 capitalize">
                              {t.stav}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </DialogContent>
    </Dialog>
  )
}
