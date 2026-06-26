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
  BookOpen,
  Settings,
  Mic,
  Mail,
  ClipboardCopy,
  FileSignature,
  ClipboardCheck,
  Check,
  Target
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
import { upsertUdalost, generateMeetingOutputViaAI, getTasksByMeeting, schvalitUdalostVystupy } from "../actions/udalosti"
import { UdalostFormDialog } from "./UdalostFormDialog"
import MeetingPripravaTab from "./MeetingPripravaTab"
import MeetingPortfolioPrunikTab from "./MeetingPortfolioPrunikTab"

interface MeetingWorkspaceProps {
  meeting: UdalostPlanovani
  userProfiles: { id: string; jmeno: string }[]
  onSuccess?: () => void
  trigger: React.ReactElement
}

export function MeetingWorkspace({ meeting, userProfiles, onSuccess, trigger }: MeetingWorkspaceProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<"prep" | "prunik" | "agenda" | "notes" | "outputs" | "email">("prep")
  const [notesSubTab, setNotesSubTab] = useState<"write" | "dictate" | "transcript">("write")

  const isSchuzka = meeting.typ === 'schuzka'
  const brandColorClass = isSchuzka ? 'text-yellow-400 font-semibold' : 'text-orange-400 font-semibold'
  const brandBadgeClass = isSchuzka ? 'border-yellow-400/40 text-yellow-400 bg-yellow-500/10 font-bold shadow-[0_0_8px_rgba(234,179,8,0.2)]' : 'border-orange-500/40 text-orange-400 bg-orange-500/10 font-bold shadow-[0_0_8px_rgba(249,115,22,0.2)]'
  const brandBtnClass = isSchuzka ? 'border-yellow-400/40 hover:bg-yellow-500/20 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.15)]' : 'border-orange-500/40 hover:bg-orange-500/20 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
  const brandTabActiveStyle = isSchuzka ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 shadow-[0_0_8px_rgba(234,179,8,0.1)]' : 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.1)]'
  const brandItemActiveStyle = isSchuzka ? 'bg-yellow-500/15 border-yellow-500/45 text-white font-semibold shadow-[0_0_8px_rgba(234,179,8,0.15)]' : 'bg-orange-500/15 border-orange-500/45 text-white font-semibold shadow-[0_0_8px_rgba(249,115,22,0.15)]'
  const brandTextHoverClass = isSchuzka ? 'hover:text-yellow-400' : 'hover:text-orange-400'

  // Workspace Local States
  const [agenda, setAgenda] = useState<AgendaTopic[]>(meeting.agenda || [])
  const [zapis, setZapis] = useState(meeting.zapis || "")
  const [priprava, setPriprava] = useState(meeting.priprava || "")
  const [surovyPrepis, setSurovyPrepis] = useState(meeting.surovy_prepis || "")
  const [emailNavrh, setEmailNavrh] = useState(meeting.email_navrh || "")
  const [createdTasks, setCreatedTasks] = useState<any[]>([])
  const [newTopicName, setNewTopicName] = useState("")
  const [meetingStav, setMeetingStav] = useState(meeting.stav)
  
  // Timer States
  const [isMeetingActive, setIsMeetingActive] = useState(false)
  const [meetingSeconds, setMeetingSeconds] = useState(0)
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null)
  const [topicSeconds, setTopicSeconds] = useState(0)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Audio Recorder States
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync state with meeting prop when opened
  useEffect(() => {
    if (open) {
      setAgenda(meeting.agenda || [])
      setZapis(meeting.zapis || "")
      setPriprava(meeting.priprava || "")
      setSurovyPrepis(meeting.surovy_prepis || "")
      setEmailNavrh(meeting.email_navrh || "")
      setIsMeetingActive(false)
      setMeetingSeconds(0)
      setActiveTopicId(null)
      setTopicSeconds(0)
      setNotesSubTab("write")
      setAudioBlob(null)
      setMeetingStav(meeting.stav)
      
      if (meeting.stav === 'completed') {
        // Load action tasks created from this meeting
        getTasksByMeeting(meeting.id).then(res => {
          if (res.success && res.data) {
            setCreatedTasks(res.data)
          }
        })
      } else {
        // Try parsing draft tasks from meeting.popis
        let parsedDraftTasks: any[] = []
        try {
          if (meeting.popis && meeting.popis.startsWith('[')) {
            parsedDraftTasks = JSON.parse(meeting.popis)
          }
        } catch (e) {
          console.error("Chyba při parsování draft úkolů:", e)
        }
        setCreatedTasks(parsedDraftTasks)
      }
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

  // Cleanup recording timers on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Audio Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      
      let mimeType = "audio/webm;codecs=opus"
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/ogg;codecs=opus"
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/webm"
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "audio/mp4" // iOS fallback
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = ""
            }
          }
        }
      }

      const options = mimeType ? { mimeType } : undefined
      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" })
        setAudioBlob(audioBlob)
        // Clean up tracks
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start(1000)
      setIsRecording(true)
      setRecordingSeconds(0)
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1)
      }, 1000)
    } catch (err) {
      console.error("Failed to start recording:", err)
      toast.error("Nelze přistoupit k mikrofonu. Povolte prosím oprávnění.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1]
        resolve(base64String)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const handleUploadAudio = async () => {
    if (!audioBlob) return

    toast.info("Odesílám hlasovou nahrávku do Gemini k přepisu a analýze...", {
      description: "Může to trvat několik desítek sekund podle délky nahrávky."
    })

    startTransition(async () => {
      try {
        const base64 = await blobToBase64(audioBlob)
        const mimeType = audioBlob.type

        // Save current states first
        await upsertUdalost({
          ...meeting,
          agenda,
          zapis,
          priprava,
          surovy_prepis: surovyPrepis,
          email_navrh: emailNavrh
        }, meeting.id)

        const result = await generateMeetingOutputViaAI(meeting.id, base64, mimeType)
        
        if (result.success && result.data) {
          setSurovyPrepis(result.data.transcript || "")
          setZapis(result.data.summary || "")
          setEmailNavrh(result.data.email_navrh || "")
          setCreatedTasks(result.data.createdTasks || [])
          setAudioBlob(null)
          
          toast.success("Hlasový přepis dokončen!", {
            description: `Nový přepis byl zaznamenán a připojen do záložky Surový přepis.`,
            duration: 5000
          })
          
          setActiveTab("notes")
          setNotesSubTab("transcript")
          onSuccess?.()
        } else {
          toast.error("Chyba při zpracování nahrávky", { description: result.error })
        }
      } catch (err: any) {
        console.error("Audio upload error:", err)
        toast.error("Nebylo možné odeslat nahrávku", { description: err.message })
      }
    })
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
    setNotesSubTab("write")
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
        zapis,
        priprava,
        surovy_prepis: surovyPrepis,
        email_navrh: emailNavrh
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
    const sourceText = zapis.trim() || surovyPrepis.trim()
    if (!sourceText) {
      toast.error("Poznámky ze schůzky nebo surový přepis jsou prázdné. Nejprve napište poznámky nebo nadiktujte audio.")
      return
    }

    toast.info("Gemini analyzuje poznámky ze schůzky...", {
      description: "Generujeme zkrácený zápis a zakládáme akční úkoly v DB."
    })

    startTransition(async () => {
      // Save local state first
      await upsertUdalost({
        ...meeting,
        agenda,
        zapis,
        priprava,
        surovy_prepis: surovyPrepis,
        email_navrh: emailNavrh
      }, meeting.id)
      
      const result = await generateMeetingOutputViaAI(meeting.id, undefined, undefined, surovyPrepis || zapis)
      if (result.success && result.data) {
        setZapis(result.data.summary || "")
        setSurovyPrepis(result.data.transcript || "")
        setEmailNavrh(result.data.email_navrh || "")
        setCreatedTasks(result.data.createdTasks || [])
        setActiveTab("outputs")
        
        const count = result.data.createdTasks.length
        toast.success("AI zpracování schůzky dokončeno!", {
          description: `Zápis a ${count} úkolů byly navrženy a připraveny ke schválení.`,
          duration: 6000
        })
        onSuccess?.()
      } else {
        toast.error("Chyba při AI zpracování", { description: result.error })
      }
    })
  }

  // Recalculate AI Output from manual edit of surovy_prepis
  const handleGenerateFromTranscript = async () => {
    if (!surovyPrepis.trim()) {
      toast.error("Surový přepis je prázdný.")
      return
    }

    toast.info("Přepočítávám analýzu, úkoly a e-mail na základě upraveného textu...", {
      description: "Gemini generuje nový zápis, úkoly a e-mail."
    })

    startTransition(async () => {
      try {
        // Save current states first
        await upsertUdalost({
          ...meeting,
          agenda,
          zapis,
          priprava,
          surovy_prepis: surovyPrepis,
          email_navrh: emailNavrh
        }, meeting.id)

        const result = await generateMeetingOutputViaAI(meeting.id, undefined, undefined, surovyPrepis)
        
        if (result.success && result.data) {
          setZapis(result.data.summary || "")
          setEmailNavrh(result.data.email_navrh || "")
          setCreatedTasks(result.data.createdTasks || [])
          
          toast.success("AI analýza úspěšně přepočítána!", {
            description: `Navržený zápis a ${result.data.createdTasks.length} úkolů jsou připraveny ke schválení.`
          })
          setActiveTab("outputs")
          onSuccess?.()
        } else {
          toast.error("Chyba při přepočtu", { description: result.error })
        }
      } catch (err: any) {
        console.error("Transcript analysis error:", err)
        toast.error("Nebylo možné provést analýzu z textu", { description: err.message })
      }
    })
  }

  // Approval of AI outputs and creating tasks/notes in DB
  const handleApproveOutputs = () => {
    toast.info("Schvaluji zápis a zakládám úkoly v systému...", {
      description: "Tato operace chvíli potrvá."
    })

    startTransition(async () => {
      try {
        const result = await schvalitUdalostVystupy(meeting.id, zapis, emailNavrh, createdTasks)
        if (result.success) {
          toast.success("Výstupy schůzky byly úspěšně schváleny a uloženy!", {
            description: "Zápis byl publikován do Poznámek a úkoly byly vytvořeny."
          })
          
          setMeetingStav('completed')
          
          // Re-load actual tasks from DB
          const resTasks = await getTasksByMeeting(meeting.id)
          if (resTasks.success && resTasks.data) {
            setCreatedTasks(resTasks.data)
          }

          // Trigger refresh of parent views
          onSuccess?.()
        } else {
          toast.error("Chyba při schvalování výstupů", { description: result.error })
        }
      } catch (err: any) {
        console.error("Approve outputs error:", err)
        toast.error("Chyba při schvalování", { description: err.message })
      }
    })
  }

  const handleRemoveDraftTask = (index: number) => {
    const updated = [...createdTasks]
    updated.splice(index, 1)
    setCreatedTasks(updated)
  }

  // Copy Follow-up Email to Clipboard
  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailNavrh)
    toast.success("E-mail byl zkopírován do schránky")
  }

  // Mailto Link opening
  const handleMailTo = () => {
    const subject = `Zápis ze schůzky: ${meeting.nazev}`
    const body = emailNavrh
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }

  const activeTopic = agenda.find(t => t.id === activeTopicId)

  return (
    <Dialog open={open} onOpenChange={(isOpen, details: any) => {
      if (!isOpen) {
        if (details?.reason === "outsidePress" || details?.reason === "focusOut") {
          return
        }
      }
      setOpen(isOpen)
    }}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-none sm:max-w-none w-[98vw] h-[96vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-white">
        
        {/* Workspace Top Header Bar */}
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">{isSchuzka ? '🤝' : '👥'}</span>
              <DialogTitle className="text-lg font-bold text-white truncate max-w-lg md:max-w-2xl">
                {meeting.nazev}
              </DialogTitle>
              <Badge variant="outline" className={brandBadgeClass}>
                {isSchuzka ? 'Externí schůzka' : 'Interní meeting'}
              </Badge>
              {meeting.zakaznik && (
                <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs border border-zinc-700">
                  🤝 Zákazník: {meeting.zakaznik.nazev_spolecnosti}
                </Badge>
              )}
              {meeting.dodavatel && (
                <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs border border-zinc-700">
                  👥 Dodavatel: {meeting.dodavatel.nazev_spolecnosti}
                </Badge>
              )}
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
                  {isSchuzka ? 'Schůzka' : 'Meeting'}: {formatTimer(meetingSeconds)}
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
                  <StopIcon className="h-3.5 w-3.5 fill-current" /> {isSchuzka ? 'Ukončit schůzku' : 'Ukončit meeting'}
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleStartMeeting} 
                variant="outline" 
                size="sm" 
                className={`h-9 gap-1.5 font-semibold text-xs ${brandBtnClass}`}
              >
                <Play className="h-3.5 w-3.5 fill-current" /> {isSchuzka ? 'Spustit schůzku' : 'Spustit meeting'}
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

            <UdalostFormDialog
              udalost={meeting}
              userProfiles={userProfiles}
              onSuccess={onSuccess}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-zinc-800 bg-zinc-900 hover:bg-zinc-850 gap-1.5 text-xs text-zinc-300"
                >
                  <Settings className="h-3.5 w-3.5" /> Nastavení
                </Button>
              }
            />
          </div>
        </div>

        {/* Workspace Layout Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar Navigation & Tabs */}
          <div className="w-56 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between p-3 shrink-0">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-2">Sekce</span>
              
              {isSchuzka && (
                <button
                  onClick={() => setActiveTab("prep")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === "prep" ? brandTabActiveStyle : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Příprava schůzky
                </button>
              )}

              {isSchuzka && (
                <button
                  onClick={() => setActiveTab("prunik")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === "prunik" ? brandTabActiveStyle : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  <Target className="h-4 w-4" />
                  Průnik portfolia
                </button>
              )}

              <button
                onClick={() => setActiveTab("agenda")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === "agenda" ? brandTabActiveStyle : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
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
                  activeTab === "notes" ? brandTabActiveStyle : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                }`}
              >
                <FileText className="h-4 w-4" />
                Poznámky & Zápis
              </button>

              <button
                onClick={() => setActiveTab("outputs")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === "outputs" ? brandTabActiveStyle : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                AI Výstupy & Zápis
              </button>

              {isSchuzka && (
                <button
                  onClick={() => setActiveTab("email")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === "email" ? brandTabActiveStyle : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  Návrh E-mailu
                </button>
              )}
            </div>

            {/* AI Generator Button in Sidebar Footer */}
            <div className="pt-4 border-t border-zinc-900">
              <Button
                onClick={handleGenerateAI}
                disabled={isPending || (!zapis.trim() && !surovyPrepis.trim())}
                className={`w-full h-11 bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-500 hover:to-yellow-400 text-white gap-2 font-bold shadow-lg ${
                  isSchuzka ? 'shadow-yellow-500/20' : 'shadow-orange-500/20'
                }`}
              >
                <Sparkles className="h-4 w-4 fill-current animate-pulse text-yellow-300" />
                <span>AI Analýza & Zápis</span>
              </Button>
            </div>
          </div>

          {/* Central Workspace Canvas */}
          <div className="flex-1 bg-zinc-950 flex flex-col overflow-hidden">
            
            {/* PRIPRAVA TAB */}
            {activeTab === "prep" && (
              <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                <div className="mb-4 shrink-0">
                  <h3 className="text-base font-bold text-white">Příprava na schůzku</h3>
                  <p className="text-xs text-zinc-400">
                    Cíl schůzky, informace o zákazníkovi a portfolio technologií.
                  </p>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 text-zinc-100">
                  <MeetingPripravaTab meeting={meeting} zakaznik={(meeting.zakaznik as any) ?? null} />
                </div>
              </div>
            )}

            {/* PRUNIK PORTFOLIA TAB */}
            {activeTab === "prunik" && (
              <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                <div className="mb-4 shrink-0">
                  <h3 className="text-base font-bold text-white">Průnik portfolia</h3>
                  <p className="text-xs text-zinc-400">
                    Označte produktové kategorie — co zákazník odebírá, o co má zájem a co cílíme.
                  </p>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 text-zinc-100">
                  <MeetingPortfolioPrunikTab
                    zakaznikId={meeting.zakaznik_id}
                    initialPrunik={(meeting.zakaznik?.portfolio_prunik as Record<string, any>) ?? null}
                  />
                </div>
              </div>
            )}

            {/* TEMA A AGENDA TAB */}
            {activeTab === "agenda" && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isSchuzka ? 'Program a témata schůzky' : 'Program a témata meetingu'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {isSchuzka 
                        ? 'Připravte si body schůzky, které chcete postupně probrat.' 
                        : 'Připravte si body meetingu, které chcete postupně probrat.'}
                    </p>
                  </div>
                  
                  {/* Celkový čas agendy */}
                  <div className="flex items-center gap-1.5 text-zinc-400 text-xs bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-850">
                    <Clock className={`h-4 w-4 ${brandColorClass}`} />
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
                    className={`bg-zinc-900 border-zinc-800 h-10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ring ${
                      isSchuzka ? 'focus:border-indigo-500 focus-visible:ring-indigo-500/20' : 'focus:border-purple-500 focus-visible:ring-purple-500/20'
                    }`}
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
                      <p className="text-sm font-semibold">
                        {isSchuzka ? 'Tato schůzka zatím nemá žádná témata.' : 'Tento meeting zatím nemá žádná témata.'}
                      </p>
                      <p className="text-xs text-zinc-600 max-w-sm">
                        {isSchuzka 
                          ? 'Zadejte první téma výše k naplánování agendy schůzky.' 
                          : 'Zadejte první téma výše k naplánování agendy meetingu.'}
                      </p>
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
                                className={`text-zinc-500 transition-colors shrink-0 ${brandTextHoverClass}`}
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
                  
                  <div className="flex-1 overflow-y-auto mb-4">
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
                                ? brandItemActiveStyle
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
                                className={`text-zinc-500 transition-colors ${brandTextHoverClass}`}
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

                {/* Notes & Recording Sub-tab area */}
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                  
                  {/* Notes Sub-tabs Selection */}
                  {isSchuzka && (
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <div className="flex gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
                        <button
                          onClick={() => setNotesSubTab("write")}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                            notesSubTab === "write" 
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5" /> Psát poznámky
                        </button>
                        <button
                          onClick={() => setNotesSubTab("dictate")}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                            notesSubTab === "dictate" 
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <Mic className="h-3.5 w-3.5" /> Diktovat hlasem
                        </button>
                        <button
                          onClick={() => setNotesSubTab("transcript")}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                            notesSubTab === "transcript" 
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <FileSignature className="h-3.5 w-3.5" /> Surový přepis
                          {surovyPrepis && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-zinc-500 hidden md:inline">
                        {notesSubTab === "write" && "Tip: Zapište klíčové body, na konci Gemini vygeneruje čistý zápis."}
                        {notesSubTab === "dictate" && "Tip: Nahrávejte hlasem v autě ihned po schůzce pro okamžitou analýzu."}
                        {notesSubTab === "transcript" && "Tip: Zde můžete opravit přepis před finálním přepočítáním AI."}
                      </span>
                    </div>
                  )}

                  {/* Notes Sub-tab Content Panels */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {(!isSchuzka || notesSubTab === "write") && (
                      <div className="flex-1 border border-zinc-800 bg-zinc-900/20 rounded-xl overflow-hidden flex flex-col">
                        <RichTextEditor
                          value={zapis}
                          onChange={setZapis}
                          placeholder="Sem zapište vše, co zaznělo, schválené body, úkoly, dohody a nápady..."
                          className="border-none min-h-full"
                        />
                      </div>
                    )}

                    {notesSubTab === "dictate" && (
                      <div className="flex-1 border border-zinc-800 bg-zinc-900/10 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-6 overflow-y-auto">
                        <div className="max-w-md space-y-2">
                          <h4 className="text-sm font-bold text-white">Nahrávání hlasových poznámek</h4>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Po schůzce stačí spustit nahrávání na telefonu nebo počítači a nadiktovat vše důležité. Po dokončení odešlete nahrávku k analýze – Gemini z ní připraví zápis, akční úkoly i návrh e-mailu.
                          </p>
                        </div>

                        {/* Recorder Widget */}
                        <div className="flex flex-col items-center gap-4">
                          {isRecording ? (
                            <div className="flex flex-col items-center gap-3">
                              <div className="h-20 w-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                                <button
                                  onClick={stopRecording}
                                  className="h-8 w-8 rounded-md bg-red-500 flex items-center justify-center text-white"
                                  title="Zastavit nahrávání"
                                >
                                  <StopIcon className="h-4.5 w-4.5 fill-current" />
                                </button>
                              </div>
                              <span className="font-mono text-sm font-bold text-red-500 animate-pulse">
                                Nahrávám: {formatTimer(recordingSeconds)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3">
                              <button
                                onClick={startRecording}
                                className={`h-20 w-20 rounded-full border flex items-center justify-center transition-all ${
                                  isSchuzka
                                    ? "bg-yellow-500/10 border-2 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                                    : "bg-orange-500/10 border-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                                }`}
                                title="Spustit nahrávání"
                              >
                                <Mic className="h-8 w-8" />
                              </button>
                              <span className="text-xs text-zinc-400 font-semibold">
                                Klikněte pro spuštění nahrávání
                              </span>
                            </div>
                          )}

                          {audioBlob && !isRecording && (
                            <div className="flex flex-col items-center gap-3 mt-4">
                              <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl w-72 flex flex-col gap-2 items-center">
                                <p className="text-[10px] text-zinc-400 font-semibold">Náhled nahrávky před odesláním:</p>
                                <audio src={URL.createObjectURL(audioBlob)} controls className="w-full h-8 bg-zinc-950 rounded" />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleUploadAudio}
                                  disabled={isPending}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 gap-1.5 text-xs rounded-lg shadow-lg shadow-emerald-600/15"
                                >
                                  <Sparkles className="h-3.5 w-3.5 fill-current" /> Odeslat k analýze
                                </Button>
                                <Button
                                  onClick={() => setAudioBlob(null)}
                                  variant="outline"
                                  className="border-zinc-800 text-zinc-400 hover:text-zinc-200 h-9 text-xs"
                                >
                                  Smazat
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {notesSubTab === "transcript" && (
                      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                        <div className="flex-1 border border-zinc-800 bg-zinc-900/20 rounded-xl p-4 flex flex-col">
                          <textarea
                            value={surovyPrepis}
                            onChange={e => setSurovyPrepis(e.target.value)}
                            placeholder="Zde se po dokončení nahrávání zobrazí surový přepis schůzky od Gemini. Můžete ho upravit a zpětně přepočítat výstupy."
                            className="w-full flex-1 bg-transparent border-none resize-none text-sm text-zinc-300 focus:outline-none placeholder-zinc-700 leading-relaxed overflow-y-auto font-mono"
                          />
                        </div>
                        <div className="flex justify-end shrink-0">
                          <Button
                            onClick={handleGenerateFromTranscript}
                            disabled={isPending || !surovyPrepis.trim()}
                            className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold h-10 px-4 gap-1.5 text-xs rounded-lg shadow-lg shadow-emerald-500/10"
                          >
                            <Sparkles className="h-3.5 w-3.5 fill-current" /> Přepočítat AI analýzu z textu
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* VYSTUPY A AI TAB */}
            {activeTab === "outputs" && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden gap-4">
                {meetingStav !== 'completed' ? (
                  <div className="flex items-center justify-between p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">⚠️</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-yellow-400">Návrh čeká na schválení</span>
                        <span className="text-xs text-zinc-400">Zkontrolujte zápis, e-mail a úkoly. Můžete smazat nevyhovující úkoly a pak kliknout na tlačítko vpravo.</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleApproveOutputs}
                      disabled={isPending}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 gap-1.5 text-xs rounded-lg shadow-lg shadow-emerald-600/15 shrink-0"
                    >
                      <Check className="h-4 w-4" /> Schválit zápis a založit úkoly
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shrink-0">
                    <span className="text-xl">✓</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-emerald-400">Výstupy schůzky byly schváleny</span>
                      <span className="text-xs text-zinc-400">Zápis byl uložen do Knowledge Base a úkoly byly úspěšně založeny v ERP.</span>
                    </div>
                  </div>
                )}

                <div className="flex-1 flex overflow-hidden gap-6">
                  {/* Left side: Beautiful Markdown AI Output */}
                  <div className="flex-1 flex flex-col border border-zinc-800 bg-zinc-900/20 rounded-xl p-4 overflow-hidden">
                    <div className="flex justify-between items-center mb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <Sparkles className={`h-4 w-4 ${brandColorClass} fill-current`} />
                        <span className="text-xs font-bold text-white">
                          {isSchuzka ? 'Strukturovaný zápis ze schůzky' : 'Strukturovaný zápis z meetingu'}
                        </span>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 h-5 text-[9px]">
                        Zápis od AI
                      </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto prose prose-sm dark:prose-invert max-w-none bg-zinc-950/20 border border-zinc-850 p-4 rounded-lg select-text">
                      {zapis ? (
                        <div className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                          {zapis}
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-xs italic">Zatím žádný zápis schůzky. Přejděte na záložku Poznámky a nahrajte nebo zapište průběh.</p>
                      )}
                    </div>
                  </div>

                  {/* Right side: List of action tasks */}
                  <div className="w-[450px] flex flex-col border border-zinc-800 bg-zinc-900/20 rounded-xl p-4 overflow-hidden shrink-0">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <span className="text-xs font-bold text-white">
                        {meetingStav !== 'completed' ? 'Navržené akční kroky (Draft)' : 'Vazební akční kroky (ERP Úkoly)'}
                      </span>
                      <Badge variant="outline" className="border-zinc-800 text-zinc-400 bg-zinc-900 h-5 text-[9px]">
                        {meetingStav !== 'completed' ? 'Draft úkoly' : 'Aktivní úkoly'}
                      </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-zinc-950/20 border border-zinc-850 p-3 rounded-lg">
                      {createdTasks.length === 0 ? (
                        <div className="text-zinc-500 text-xs italic text-center py-6">
                          {meetingStav !== 'completed' 
                            ? 'Zde se zobrazí úkoly navržené AI, které budete moci upravit a schválit.'
                            : 'Žádné úkoly pro tuto schůzku.'}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {createdTasks.map((t, idx) => {
                            const ownerName = t.vlastnik?.jmeno || userProfiles.find(u => u.id === t.vlastnik_id)?.jmeno || "Nepřiřazeno"
                            return (
                              <div key={t.id || idx} className="p-3 bg-zinc-900 border border-zinc-850 rounded-lg flex items-center justify-between gap-3">
                                <div className="space-y-0.5 min-w-0">
                                  <p className="text-xs font-semibold text-zinc-300 truncate">{t.nazev}</p>
                                  <p className="text-[10px] text-zinc-500">
                                    Vlastník: {ownerName} 
                                    {t.datum_splatnosti && ` · Termín: ${new Date(t.datum_splatnosti).toLocaleDateString('cs-CZ')}`}
                                    {t.oddeleni && ` · Oddělení: ${ODDELENI_CONFIG[t.oddeleni]?.label || t.oddeleni}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0 capitalize">
                                    {t.stav || 'todo'}
                                  </Badge>
                                  {meetingStav !== 'completed' && (
                                    <Button
                                      onClick={() => handleRemoveDraftTask(idx)}
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-zinc-500 hover:text-red-400"
                                      title="Odstranit z návrhu"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EMAIL NAVRH TAB */}
            {activeTab === "email" && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div>
                    <h3 className="text-base font-bold text-white">Návrh follow-up e-mailu</h3>
                    <p className="text-xs text-zinc-400">
                      AI vygenerovaný e-mail, který můžete odeslat zákazníkovi/dodavateli jako shrnutí schůzky.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleCopyEmail}
                      disabled={!emailNavrh}
                      className="bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 h-9 px-3 gap-1.5 text-xs font-semibold"
                    >
                      <ClipboardCopy className="h-4 w-4" /> Kopírovat e-mail
                    </Button>
                    <Button
                      onClick={handleMailTo}
                      disabled={!emailNavrh}
                      className={`h-9 px-3 gap-1.5 text-xs font-semibold text-white ${
                        isSchuzka 
                          ? 'bg-yellow-600 hover:bg-yellow-500 shadow-lg shadow-yellow-600/20' 
                          : 'bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-600/20'
                      }`}
                    >
                      <Mail className="h-4 w-4" /> Odeslat (mailto)
                    </Button>
                  </div>
                </div>

                <div className="flex-1 border border-zinc-800 bg-zinc-900/20 rounded-xl p-4 flex flex-col">
                  <textarea
                    value={emailNavrh}
                    onChange={e => setEmailNavrh(e.target.value)}
                    placeholder="E-mail bude automaticky vygenerován po dokončení AI analýzy schůzky."
                    className="w-full flex-1 bg-transparent border-none resize-none text-sm text-zinc-300 focus:outline-none placeholder-zinc-700 leading-relaxed font-sans overflow-y-auto"
                  />
                </div>
              </div>
            )}

          </div>

        </div>

      </DialogContent>
    </Dialog>
  )
}
