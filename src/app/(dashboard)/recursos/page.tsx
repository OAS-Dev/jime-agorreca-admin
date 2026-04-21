'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  FileDown,
  UploadCloud,
  Trash2,
  Pencil,
  Loader2,
  Globe,
  Lock,
  ExternalLink,
  X,
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ── Types ─────────────────────────────────────────────────────────────────────

type ResourceAccess = 'PUBLIC' | 'SUBSCRIBERS_ONLY'

interface Resource {
  id: string
  title: string
  description: string | null
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  category: string
  access: ResourceAccess
  order: number
  createdAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const getFileType = (mimeType: string, fileName: string): string => {
  const ext = fileName.split('.').pop()?.toUpperCase()
  return ext ?? 'FILE'
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })

const CATEGORIES = ['Guías', 'Plantillas', 'Scripts', 'Imágenes', 'Misc']

// ── Upload form modal ─────────────────────────────────────────────────────────

interface UploadFormProps {
  open: boolean
  onClose: () => void
  onSuccess: (resource: Resource) => void
  token: string
}

const UploadModal = ({ open, onClose, onSuccess, token }: UploadFormProps) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Guías')
  const [access, setAccess] = useState<ResourceAccess>('SUBSCRIBERS_ONLY')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setTitle('')
    setDescription('')
    setCategory('Guías')
    setAccess('SUBSCRIBERS_ONLY')
    setFile(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setError('Seleccioná un archivo'); return }
    if (!title.trim()) { setError('El título es requerido'); return }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title.trim())
    if (description.trim()) formData.append('description', description.trim())
    formData.append('category', category)
    formData.append('access', access)

    try {
      const { data } = await api.post<{ resource: Resource }>('/resources', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })
      onSuccess(data.resource)
      handleClose()
    } catch {
      setError('Error al subir el recurso. Verificá el archivo e intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir recurso</DialogTitle>
          <DialogDescription>
            Completá los datos y seleccioná el archivo a subir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-8 pt-2">
          {/* File picker */}
          <div className="space-y-2">
            <p className="text-sm font-medium leading-none">Archivo *</p>
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-low p-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
              onClick={() => fileRef.current?.click()}
            >
              <UploadCloud className="h-8 w-8 text-on-surface-variant/50" />
              {file ? (
                <div className="flex items-center gap-2">
                  <span className="font-body text-sm font-semibold text-on-surface">
                    {file.name}
                    <span className="ml-1 font-normal text-on-surface-variant">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                    className="text-on-surface-variant hover:text-on-surface"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="font-body text-sm font-medium text-on-surface-variant">
                  Hacé click para seleccionar un archivo
                  <br />
                  <span className="text-xs opacity-60">PDF, XLSX, DOCX, ZIP, CSV, imágenes — máx. 100 MB</span>
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.zip,.csv,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setFile(f)
                    if (!title) {
                      const suggested = f.name
                        .replace(/\.[^.]+$/, '')        // quitar extensión
                        .replace(/[-_]+/g, ' ')         // guiones/underscores → espacios
                        .replace(/\s+/g, ' ')           // espacios múltiples → uno
                        .trim()
                        .replace(/\b\w/g, c => c.toUpperCase()) // Title Case
                      setTitle(suggested)
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-1.5">
              <p className="text-sm font-medium leading-none">Nombre visible *</p>
              <span className="text-xs text-on-surface-variant">— lo que verán las usuarias</span>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Guía de Estructura de Campaña"
              className="border border-outline-variant"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">
              Descripción{' '}
              <span className="font-normal text-on-surface-variant">(opcional)</span>
            </p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del contenido..."
              rows={2}
              className="border border-outline-variant"
            />
          </div>

          {/* Category + Access */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Categoría</p>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="border border-outline-variant"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Acceso</p>
              <Select value={access} onValueChange={(v) => setAccess(v as ResourceAccess)}>
                <SelectTrigger className="border border-outline-variant"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUBSCRIBERS_ONLY">Solo suscriptores</SelectItem>
                  <SelectItem value="PUBLIC">Público</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !file}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : 'Subir recurso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  resource: Resource
  open: boolean
  onClose: () => void
  onSuccess: (resource: Resource) => void
  token: string
}

const EditModal = ({ resource, open, onClose, onSuccess, token }: EditModalProps) => {
  const [title, setTitle] = useState(resource.title)
  const [description, setDescription] = useState(resource.description ?? '')
  const [category, setCategory] = useState(resource.category)
  const [access, setAccess] = useState<ResourceAccess>(resource.access)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTitle(resource.title)
    setDescription(resource.description ?? '')
    setCategory(resource.category)
    setAccess(resource.access)
    setError(null)
  }, [resource])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('El título es requerido'); return }

    setLoading(true)
    setError(null)

    try {
      const { data } = await api.patch<{ resource: Resource }>(
        `/resources/${resource.id}`,
        { title: title.trim(), description: description.trim() || null, category, access },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      onSuccess(data.resource)
      onClose()
    } catch {
      setError('Error al actualizar el recurso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar recurso</DialogTitle>
          <DialogDescription>Modificá los metadatos del recurso. El archivo no cambia.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-8 pt-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">Título</p>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="border border-outline-variant" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">
              Descripción{' '}
              <span className="font-normal text-on-surface-variant">(opcional)</span>
            </p>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="border border-outline-variant" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Categoría</p>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="border border-outline-variant"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Acceso</p>
              <Select value={access} onValueChange={(v) => setAccess(v as ResourceAccess)}>
                <SelectTrigger className="border border-outline-variant"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUBSCRIBERS_ONLY">Solo suscriptores</SelectItem>
                  <SelectItem value="PUBLIC">Público</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  resource: Resource | null
  onConfirm: () => Promise<void>
  onCancel: () => void
  loading: boolean
}

const DeleteDialog = ({ resource, onConfirm, onCancel, loading }: DeleteDialogProps) => (
  <Dialog open={!!resource} onOpenChange={(v) => !v && onCancel()}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>¿Eliminar recurso?</DialogTitle>
        <DialogDescription>
          Se eliminará <strong>{resource?.title}</strong> y el archivo de Storage. Esta acción no se puede deshacer.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="pt-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button variant="destructive" onClick={onConfirm} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

// ── Page ──────────────────────────────────────────────────────────────────────

const RecursosAdminPage = () => {
  const { data: session } = useSession()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editing, setEditing] = useState<Resource | null>(null)
  const [deleting, setDeleting] = useState<Resource | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const token = session?.backendToken ?? ''

  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const { data } = await api.get<{ resources: Resource[] }>('/resources', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setResources(data.resources)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const handleUploaded = (resource: Resource) => {
    setResources((prev) => [resource, ...prev])
  }

  const handleEdited = (updated: Resource) => {
    setResources((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await api.delete(`/resources/${deleting.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setResources((prev) => prev.filter((r) => r.id !== deleting.id))
      setDeleting(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ink">
            Recursos descargables
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {resources.length} {resources.length === 1 ? 'recurso' : 'recursos'} disponibles
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <UploadCloud className="h-4 w-4" />
          Subir recurso
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-outline-variant bg-paper">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
            <FileDown className="h-10 w-10 opacity-30" />
            <p className="text-sm font-semibold">Todavía no hay recursos.</p>
            <p className="text-xs opacity-60">Subí el primero con el botón de arriba.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead>Acceso</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="max-w-[240px]">
                      <p className="truncate text-sm font-semibold text-ink">{r.title}</p>
                      {r.description && (
                        <p className="truncate text-xs text-ink-muted">{r.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-ink-muted">{r.category}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-bold uppercase text-ink-muted">
                      {getFileType(r.mimeType, r.fileName)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-ink-muted">{formatFileSize(r.fileSize)}</span>
                  </TableCell>
                  <TableCell>
                    {r.access === 'PUBLIC' ? (
                      <Badge variant="success" className="gap-1">
                        <Globe className="h-3 w-3" /> Público
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="gap-1">
                        <Lock className="h-3 w-3" /> Suscriptores
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-ink-muted">{formatDate(r.createdAt)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="Ver archivo"
                      >
                        <a href={r.fileUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(r)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(r)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modals */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={handleUploaded}
        token={token}
      />

      {editing && (
        <EditModal
          resource={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
          onSuccess={handleEdited}
          token={token}
        />
      )}

      <DeleteDialog
        resource={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  )
}

export default RecursosAdminPage
