'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { saveProductFileMetadata, deleteProductFile, getProductFiles, ProductFile } from '../actions/assets'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { toast } from 'sonner'
import { FileText, Trash2, Download, ExternalLink, UploadCloud, AlertCircle, Link2 } from 'lucide-react'

interface ProductDocumentsTabProps {
  productId: string
  initialFiles: ProductFile[]
  documentTypes: { id: string, nazev: string }[]
}

export function ProductDocumentsTab({ productId, initialFiles, documentTypes }: ProductDocumentsTabProps) {
  const [files, setFiles] = useState<ProductFile[]>(initialFiles)
  const [isUploading, setIsUploading] = useState(false)
  const [isSavingLink, setIsSavingLink] = useState(false)
  const [selectedDocTypeId, setSelectedDocTypeId] = useState('tds')
  const [customName, setCustomName] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // helper to format file size
  function formatBytes(bytes: number | null) {
    if (bytes === null) return 'Externí odkaz'
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // get badge style for document type
  function getBadgeStyle(typeId: string) {
    switch (typeId) {
      case 'tds':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'msds':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'coa':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'manual':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'cert':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    }
  }

  // Handle uploading of a file
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const file = fileList[0]
    
    // Check file size (limit to 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Chyba: Soubor přesahuje maximální povolenou velikost 20 MB.")
      return
    }

    setIsUploading(true)

    try {
      const supabase = createClient()
      
      // Generate unique path: produkty/[productId]/[timestamp]_[filename]
      const cleanName = file.name.replace(/[^a-zA-Z0-9\.\-_]/g, "_")
      const filePath = `produkty/${productId}/${Date.now()}_${cleanName}`

      // Upload directly to private Supabase bucket
      const { error: uploadError } = await supabase.storage
        .from('product-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Save metadata record using Server Action
      const docName = customName.trim() || file.name.substring(0, file.name.lastIndexOf('.')) || file.name
      const { error: dbError } = await saveProductFileMetadata({
        produkt_id: productId,
        typ_dokumentu_id: selectedDocTypeId,
        nazev: docName,
        file_path: filePath,
        file_size_bytes: file.size,
        content_type: file.type,
        is_external: false
      })

      if (dbError) {
        throw new Error(dbError.message)
      }

      // Refresh list
      const { data: updatedFiles } = await getProductFiles(productId)
      if (updatedFiles) {
        setFiles(updatedFiles)
      }

      // Reset fields
      setCustomName("")
      if (fileInputRef.current) fileInputRef.current.value = ""
      toast.success("Soubor byl úspěšně nahrán.")
    } catch (error: any) {
      console.error(error)
      toast.error(`Nahrávání selhalo: ${error.message || error}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Handle saving an external link
  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!externalUrl.trim()) {
      toast.error("Chyba: Zadejte platnou URL adresu.")
      return
    }

    // Basic URL validation
    try {
      new URL(externalUrl.trim())
    } catch (_) {
      toast.error("Chyba: Zadaný odkaz není platná URL adresa.")
      return
    }

    const docName = customName.trim()
    if (!docName) {
      toast.error("Chyba: Zadejte název pro externí dokument.")
      return
    }

    setIsSavingLink(true)

    try {
      const { error: dbError } = await saveProductFileMetadata({
        produkt_id: productId,
        typ_dokumentu_id: selectedDocTypeId,
        nazev: docName,
        file_path: externalUrl.trim(),
        file_size_bytes: null,
        content_type: 'url',
        is_external: true
      })

      if (dbError) {
        throw new Error(dbError.message)
      }

      // Refresh list
      const { data: updatedFiles } = await getProductFiles(productId)
      if (updatedFiles) {
        setFiles(updatedFiles)
      }

      // Reset fields
      setCustomName("")
      setExternalUrl("")
      toast.success("Externí odkaz byl úspěšně uložen.")
    } catch (error: any) {
      console.error(error)
      toast.error(`Uložení odkazu selhalo: ${error.message || error}`)
    } finally {
      setIsSavingLink(false)
    }
  }

  // Handle deleting a file
  const handleDelete = async (fileId: string, filePath: string, isExternal: boolean) => {
    if (!confirm("Opravdu chcete smazat tento záznam?")) return

    try {
      const { error } = await deleteProductFile(fileId, filePath, productId, isExternal)
      if (error) {
        throw new Error(error.message)
      }

      // Refresh files list
      setFiles(prev => prev.filter(f => f.id !== fileId))
      toast.success("Dokument byl úspěšně odstraněn.")
    } catch (error: any) {
      toast.error(`Chyba při mazání: ${error.message || error}`)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Input Box for Upload/Link */}
      <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h3 className="text-base font-semibold text-zinc-300">Přidat nový dokument</h3>
          
          {/* Tabs header selector */}
          <div className="flex p-1 bg-zinc-950 border border-zinc-850 rounded-lg w-fit">
            <button
              type="button"
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-zinc-850 text-white shadow border border-zinc-800'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
              onClick={() => setActiveTab('upload')}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Nahrát soubor
            </button>
            <button
              type="button"
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'link'
                  ? 'bg-zinc-850 text-white shadow border border-zinc-800'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
              onClick={() => setActiveTab('link')}
            >
              <Link2 className="h-3.5 w-3.5" />
              Vložit odkaz
            </button>
          </div>
        </div>

        {activeTab === 'upload' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label>Typ dokumentu</Label>
              <Select onValueChange={(val: string | null) => setSelectedDocTypeId(val || 'tds')} value={selectedDocTypeId}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Vyberte typ">
                    {documentTypes.find(d => d.id === selectedDocTypeId)?.nazev}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  {documentTypes.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.nazev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customName">Vlastní název dokumentu (volitelné)</Label>
              <Input 
                id="customName"
                placeholder="např. Technický list CZ 2026"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="file"
                id="product-file-upload"
                ref={fileInputRef}
                onChange={handleUpload}
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={isUploading}
              />
              <Button 
                type="button"
                className="w-full gap-2 font-semibold bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-750"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="h-4 w-4" />
                {isUploading ? "Nahrávám..." : "Vybrat a nahrát soubor"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveLink} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 md:col-span-1">
              <Label>Typ dokumentu</Label>
              <Select onValueChange={(val: string | null) => setSelectedDocTypeId(val || 'tds')} value={selectedDocTypeId}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Vyberte typ">
                    {documentTypes.find(d => d.id === selectedDocTypeId)?.nazev}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  {documentTypes.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.nazev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="linkName">Název dokumentu</Label>
              <Input 
                id="linkName"
                placeholder="např. Google Drive TDS - Resin"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="bg-zinc-950 border-zinc-800"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="externalUrl">URL adresa odkazu</Label>
              <Input 
                id="externalUrl"
                placeholder="https://drive.google.com/..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="bg-zinc-950 border-zinc-800"
                required
              />
            </div>

            <div className="flex items-center gap-2 md:col-span-1">
              <Button 
                type="submit"
                className="w-full gap-2 font-semibold"
                disabled={isSavingLink}
              >
                <Link2 className="h-4 w-4" />
                {isSavingLink ? "Ukládám..." : "Uložit externí odkaz"}
              </Button>
            </div>
          </form>
        )}

        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3 text-zinc-500 shrink-0" />
          {activeTab === 'upload' 
            ? "Soubory jsou nahrávány do privátního Supabase úložiště a přístupné pouze přes časově omezená URL."
            : "Externí odkazy (např. na Google Drive, OneDrive) nespotřebovávají kvótu úložiště a odkazují přímo na externí zdroje."}
        </p>
      </div>

      {/* Files List Table */}
      <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4 shadow-xl">
        <h3 className="text-base font-semibold text-zinc-300">Seznam dokumentů</h3>
        {files.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg">
            K tomuto produktu nebyly nahrány žádné dokumenty ani vloženy žádné odkazy.
          </div>
        ) : (
          <div className="overflow-x-auto border border-zinc-800 rounded-lg">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs font-bold uppercase tracking-wider bg-zinc-900/30">
                  <th className="p-3">Typ dokumentu</th>
                  <th className="p-3">Název souboru / odkazu</th>
                  <th className="p-3">Velikost</th>
                  <th className="p-3">Autor / Změna</th>
                  <th className="p-3 text-right">Akce</th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.id} className="border-b border-zinc-850 hover:bg-zinc-900/20 transition-colors">
                    <td className="p-3">
                      <Badge variant="outline" className={getBadgeStyle(file.typ_dokumentu_id)}>
                        {file.c_typy_dokumentu?.nazev}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                        <span className="truncate max-w-[200px] md:max-w-[300px]" title={file.nazev}>
                          {file.nazev}
                        </span>
                        {file.is_external && (
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/5 text-emerald-400 border-emerald-500/10 px-1 py-0 h-4 font-normal">
                            Externí odkaz
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-zinc-400 font-mono text-xs">
                      {formatBytes(file.file_size_bytes)}
                    </td>
                    <td className="p-3 text-xs text-zinc-500">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-400">{file.vytvoril?.jmeno || "Systém"}</span>
                        <span>{new Date(file.vytvoreno_at).toLocaleDateString("cs-CZ")}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {file.signedUrl ? (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                          onClick={() => window.open(file.signedUrl || "", '_blank')}
                        >
                          {file.is_external ? (
                            <ExternalLink className="h-4 w-4" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs text-zinc-500 italic pr-2">Exspirováno</span>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                        onClick={() => handleDelete(file.id, file.file_path, file.is_external)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
