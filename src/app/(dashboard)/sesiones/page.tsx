'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  Video,
  Trash2,
  Pencil,
  Loader2,
  CalendarClock,
  Radio,
  PlayCircle,
  Plus,
  Film,
  UploadCloud,
  RefreshCw,
} from 'lucide-react'
import api from '@/lib/api'
import { DateTimePicker } from '@/components/ui/date-time-picker'
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

type SessionType = 'QA' | 'WORKSHOP' | 'MASTERCLASS'
type SessionStatus = 'UPCOMING' | 'LIVE' | 'RECORDED' | 'CANCELLED'

interface LiveSession {
  id: string
  type: SessionType
  title: string
  description: string | null
  scheduledAt: string
  duration: number | null
  meetUrl: string | null
  recordingUrl: string | null
  recordingBunnyId: string | null
  status: SessionStatus
  attendees: number
  createdAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<SessionType, string> = {
  QA: 'Q&A',
  WORKSHOP: 'Workshop',
  MASTERCLASS: 'Masterclass',
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  UPCOMING: 'Próxima',
  LIVE: 'En vivo',
  RECORDED: 'Grabada',
  CANCELLED: 'Cancelada',
}

const STATUS_VARIANT: Record<SessionStatus, 'neutral' | 'success' | 'default' | 'error'> = {
  UPCOMING: 'neutral',
  LIVE: 'success',
  RECORDED: 'default',
  CANCELLED: 'error',
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })


// ── Recording upload modal ────────────────────────────────────────────────────

type BunnyStatus = 'PROCESSING' | 'READY' | 'ERROR'

interface RecordingUploadModalProps {
  open: boolean
  onClose: () => void
  session: LiveSession
  onSuccess: (updated: LiveSession) => void
  token: string
}

const RecordingUploadModal = ({ open, onClose, session, onSuccess, token }: RecordingUploadModalProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadDone, setUploadDone] = useState(false)
  const [bunnyStatus, setBunnyStatus] = useState<BunnyStatus | null>(null)
  const [bunnyDuration, setBunnyDuration] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setFile(null)
      setProgress(0)
      setUploadDone(false)
      setBunnyStatus(null)
      setBunnyDuration(null)
      setSyncing(false)
      setShowUploadForm(false)
      setError(null)
    }
  }, [open])

  const hasRecording = session.recordingBunnyId !== null && !showUploadForm

  const handleClose = () => {
    if (uploading) return
    onClose()
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setProgress(0)
    setUploadDone(false)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await api.post<{ session: LiveSession }>(
        `/sessions/${session.id}/recording`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
          onUploadProgress: (evt) => {
            if (evt.total) setProgress(Math.round((evt.loaded * 100) / evt.total))
          },
          maxBodyLength: Infinity,
          timeout: 0,
        },
      )
      setUploadDone(true)
      setShowUploadForm(false)
      onSuccess(data.session)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al subir la grabación.'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleSync = async () => {
    if (syncing) return
    setSyncing(true)
    setError(null)
    try {
      const { data } = await api.post<{ bunnyStatus: BunnyStatus; duration: number }>(
        `/sessions/${session.id}/recording/sync`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setBunnyStatus(data.bunnyStatus)
      setBunnyDuration(data.duration ?? null)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al sincronizar.'
      setError(msg)
    } finally {
      setSyncing(false)
    }
  }

  const renderStatusChip = () => {
    if (uploadDone && !bunnyStatus) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 text-[10px] font-body font-black uppercase tracking-wide text-on-secondary-container">
          <Loader2 className="h-3 w-3 animate-spin" />
          Procesando en Bunny...
        </span>
      )
    }
    if (bunnyStatus === 'PROCESSING') {
      return (
        <Badge variant="warning" className="gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Procesando...
        </Badge>
      )
    }
    if (bunnyStatus === 'READY') {
      return (
        <Badge variant="success" className="gap-1">
          ✓ Lista para reproducir
          {bunnyDuration ? ` · ${Math.round(bunnyDuration / 60)} min` : ''}
        </Badge>
      )
    }
    if (bunnyStatus === 'ERROR') {
      return <Badge variant="error">✗ Error en Bunny</Badge>
    }
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Grabación de sesión</DialogTitle>
          <DialogDescription>
            {hasRecording
              ? 'Esta sesión ya tiene una grabación subida a Bunny.net.'
              : 'Subí el archivo de video de la sesión para que esté disponible en la plataforma.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-8 pt-2 pb-6">
          {/* ── Estado actual (tiene grabación) ── */}
          {hasRecording && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-on-surface-variant">ID Bunny</p>
                  <p className="truncate max-w-[200px] text-xs font-mono text-on-surface">
                    {session.recordingBunnyId}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-on-surface-variant">Estado</p>
                  <div className="flex items-center gap-2">
                    {renderStatusChip() ?? (
                      <span className="text-xs text-on-surface-variant">Sin sincronizar</span>
                    )}
                  </div>
                </div>

                {bunnyStatus === 'READY' && session.recordingUrl && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-on-surface-variant">URL embed</p>
                    <p className="truncate text-xs font-mono text-on-surface bg-surface-container-high rounded-lg px-2 py-1.5">
                      {session.recordingUrl}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {(bunnyStatus !== 'READY') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={syncing}
                    className="gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </Button>
                )}
                {bunnyStatus === 'ERROR' && (
                  <Button
                    size="sm"
                    onClick={() => { setShowUploadForm(true); setBunnyStatus(null) }}
                  >
                    Reintentar subida
                  </Button>
                )}
              </div>

              <div className="pt-1">
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="text-xs text-on-surface-variant underline-offset-2 hover:underline"
                >
                  Reemplazar grabación
                </button>
              </div>
            </div>
          )}

          {/* ── Upload form (sin grabación o reemplazo) ── */}
          {!hasRecording && (
            <div className="space-y-4">
              {/* Chip "procesando" post-upload */}
              {uploadDone && !bunnyStatus && (
                <div className="flex justify-center py-2">
                  {renderStatusChip()}
                </div>
              )}

              {!uploadDone && (
                <>
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-low p-8 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                    onClick={() => !uploading && fileInputRef.current?.click()}
                  >
                    <UploadCloud className="h-8 w-8 text-on-surface-variant/50" />
                    {file ? (
                      <p className="text-center font-body text-sm font-semibold text-on-surface">
                        {file.name}
                        <span className="ml-1 font-normal text-on-surface-variant">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </p>
                    ) : (
                      <p className="text-center font-body text-sm font-medium text-on-surface-variant">
                        Hacé click para seleccionar
                        <br />
                        <span className="text-xs opacity-60">MP4, MOV, WebM, MKV · máx. 2 GB</span>
                      </p>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </>
              )}

              {/* Progress bar */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-body text-xs font-semibold text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Subiendo...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={uploading}>
              {hasRecording ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!hasRecording && !uploadDone && (
              <Button onClick={handleUpload} disabled={uploading || !file}>
                {uploading ? 'Subiendo...' : 'Subir grabación'}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── New session modal ─────────────────────────────────────────────────────────

interface NewSessionModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (session: LiveSession) => void
  token: string
}

const EMPTY_FORM = {
  type: 'QA' as SessionType,
  title: '',
  description: '',
  scheduledAt: '',
  duration: '' as string,
  meetUrl: '',
  status: 'UPCOMING' as SessionStatus,
  attendees: '0',
}

const NewSessionModal = ({ open, onClose, onSuccess, token }: NewSessionModalProps) => {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setForm(EMPTY_FORM)
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const set = (field: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('El título es requerido'); return }
    if (!form.scheduledAt) { setError('La fecha y hora son requeridas'); return }

    setLoading(true)
    setError(null)

    try {
      const { data } = await api.post<{ session: LiveSession }>(
        '/sessions',
        {
          type: form.type,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          scheduledAt: form.scheduledAt,
          duration: form.duration !== '' ? parseInt(form.duration, 10) : undefined,
          meetUrl: form.meetUrl.trim() || undefined,
          status: form.status,
          attendees: parseInt(form.attendees, 10) || 0,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      onSuccess(data.session)
      handleClose()
    } catch {
      setError('Error al crear la sesión. Verificá los datos e intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva sesión en vivo</DialogTitle>
          <DialogDescription>
            Completá los datos para programar una nueva sesión.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-8 pt-2">
          {/* Tipo */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">Tipo</p>
            <Select value={form.type} onValueChange={set('type')}>
              <SelectTrigger className="border border-outline-variant"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="QA">Q&A</SelectItem>
                <SelectItem value="WORKSHOP">Workshop</SelectItem>
                <SelectItem value="MASTERCLASS">Masterclass</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">Título *</p>
            <Input
              value={form.title}
              onChange={(e) => set('title')(e.target.value)}
              placeholder="Ej: Q&A de Abril — Estrategia de contenido"
              className="border border-outline-variant"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">
              Descripción{' '}
              <span className="font-normal text-on-surface-variant">(opcional)</span>
            </p>
            <Textarea
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
              placeholder="Breve descripción de la sesión..."
              rows={2}
              className="border border-outline-variant"
            />
          </div>

          {/* Fecha + Duración */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Fecha y hora *</p>
              <DateTimePicker
                value={form.scheduledAt}
                onChange={set('scheduledAt')}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">
                Duración{' '}
                <span className="font-normal text-on-surface-variant">(opcional)</span>
              </p>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  value={form.duration}
                  onChange={(e) => set('duration')(e.target.value)}
                  placeholder="60"
                  className="border border-outline-variant pr-12"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">min</span>
              </div>
            </div>
          </div>

          {/* Meet URL */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">
              Link de Zoom{' '}
              <span className="font-normal text-on-surface-variant">(opcional)</span>
            </p>
            <Input
              value={form.meetUrl}
              onChange={(e) => set('meetUrl')(e.target.value)}
              placeholder="https://zoom.us/j/..."
              className="border border-outline-variant"
            />
          </div>

          {/* Status + Asistentes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Estado</p>
              <Select value={form.status} onValueChange={set('status')}>
                <SelectTrigger className="border border-outline-variant"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPCOMING">Próxima</SelectItem>
                  <SelectItem value="LIVE">En vivo</SelectItem>
                  <SelectItem value="RECORDED">Grabada</SelectItem>
                  <SelectItem value="CANCELLED">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Asistentes</p>
              <Input
                type="number"
                min="0"
                value={form.attendees}
                onChange={(e) => set('attendees')(e.target.value)}
                className="border border-outline-variant"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando...</> : 'Crear sesión'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  session: LiveSession
  open: boolean
  onClose: () => void
  onSuccess: (session: LiveSession) => void
  token: string
}

const EditModal = ({ session, open, onClose, onSuccess, token }: EditModalProps) => {
  const [type, setType] = useState<SessionType>(session.type)
  const [title, setTitle] = useState(session.title)
  const [description, setDescription] = useState(session.description ?? '')
  const [scheduledAt, setScheduledAt] = useState(session.scheduledAt)
  const [duration, setDuration] = useState(session.duration != null ? String(session.duration) : '')
  const [meetUrl, setMeetUrl] = useState(session.meetUrl ?? '')
  const [recordingUrl, setRecordingUrl] = useState(session.recordingUrl ?? '')
  const [status, setStatus] = useState<SessionStatus>(session.status)
  const [attendees, setAttendees] = useState(String(session.attendees))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setType(session.type)
    setTitle(session.title)
    setDescription(session.description ?? '')
    setScheduledAt(session.scheduledAt)
    setDuration(session.duration != null ? String(session.duration) : '')
    setMeetUrl(session.meetUrl ?? '')
    setRecordingUrl(session.recordingUrl ?? '')
    setStatus(session.status)
    setAttendees(String(session.attendees))
    setError(null)
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('El título es requerido'); return }
    if (!scheduledAt) { setError('La fecha y hora son requeridas'); return }

    setLoading(true)
    setError(null)

    try {
      const { data } = await api.patch<{ session: LiveSession }>(
        `/sessions/${session.id}`,
        {
          type,
          title: title.trim(),
          description: description.trim() || undefined,
          scheduledAt: scheduledAt,
          duration: duration !== '' ? parseInt(duration, 10) : undefined,
          meetUrl: meetUrl.trim() || undefined,
          recordingUrl: recordingUrl.trim() || undefined,
          status,
          attendees: parseInt(attendees, 10) || 0,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      onSuccess(data.session)
      onClose()
    } catch {
      setError('Error al actualizar la sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar sesión</DialogTitle>
          <DialogDescription>Modificá los datos de la sesión.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-8 pt-2">
          {/* Tipo */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">Tipo</p>
            <Select value={type} onValueChange={(v) => setType(v as SessionType)}>
              <SelectTrigger className="border border-outline-variant"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="QA">Q&A</SelectItem>
                <SelectItem value="WORKSHOP">Workshop</SelectItem>
                <SelectItem value="MASTERCLASS">Masterclass</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">Título *</p>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="border border-outline-variant" />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">
              Descripción{' '}
              <span className="font-normal text-on-surface-variant">(opcional)</span>
            </p>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="border border-outline-variant" />
          </div>

          {/* Fecha + Duración */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Fecha y hora *</p>
              <DateTimePicker
                value={scheduledAt}
                onChange={setScheduledAt}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">
                Duración{' '}
                <span className="font-normal text-on-surface-variant">(opcional)</span>
              </p>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="60"
                  className="border border-outline-variant pr-12"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">min</span>
              </div>
            </div>
          </div>

          {/* Meet URL */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">
              Link de Zoom{' '}
              <span className="font-normal text-on-surface-variant">(opcional)</span>
            </p>
            <Input value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)} placeholder="https://zoom.us/j/..." className="border border-outline-variant" />
          </div>

          {/* Recording URL */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">
              Link de grabación{' '}
              <span className="font-normal text-on-surface-variant">(opcional)</span>
            </p>
            <Input value={recordingUrl} onChange={(e) => setRecordingUrl(e.target.value)} placeholder="https://drive.google.com/..." className="border border-outline-variant" />
          </div>

          {/* Status + Asistentes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Estado</p>
              <Select value={status} onValueChange={(v) => setStatus(v as SessionStatus)}>
                <SelectTrigger className="border border-outline-variant"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPCOMING">Próxima</SelectItem>
                  <SelectItem value="LIVE">En vivo</SelectItem>
                  <SelectItem value="RECORDED">Grabada</SelectItem>
                  <SelectItem value="CANCELLED">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Asistentes</p>
              <Input
                type="number"
                min="0"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                className="border border-outline-variant"
              />
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
  session: LiveSession | null
  onConfirm: () => Promise<void>
  onCancel: () => void
  loading: boolean
}

const DeleteDialog = ({ session, onConfirm, onCancel, loading }: DeleteDialogProps) => (
  <Dialog open={!!session} onOpenChange={(v) => !v && onCancel()}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>¿Eliminar sesión?</DialogTitle>
        <DialogDescription>
          Se eliminará <strong>{session?.title}</strong>. Esta acción no se puede deshacer.
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

// ── Filter types ──────────────────────────────────────────────────────────────

type FilterValue = 'ALL' | SessionStatus

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Próximas', value: 'UPCOMING' },
  { label: 'En vivo', value: 'LIVE' },
  { label: 'Grabadas', value: 'RECORDED' },
  { label: 'Canceladas', value: 'CANCELLED' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

const SesionesAdminPage = () => {
  const { data: authSession } = useSession()
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [editing, setEditing] = useState<LiveSession | null>(null)
  const [deleting, setDeleting] = useState<LiveSession | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [filter, setFilter] = useState<FilterValue>('ALL')
  const [recordingSession, setRecordingSession] = useState<LiveSession | null>(null)
  const [showRecordingModal, setShowRecordingModal] = useState(false)

  const token = authSession?.backendToken ?? ''

  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const { data } = await api.get<{ sessions: LiveSession[] }>('/sessions', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setSessions(data.sessions)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const filtered =
    filter === 'ALL' ? sessions : sessions.filter((s) => s.status === filter)

  const totalUpcoming = sessions.filter((s) => s.status === 'UPCOMING' || s.status === 'LIVE').length
  const totalRecorded = sessions.filter((s) => s.status === 'RECORDED').length

  const handleCreated = (session: LiveSession) => {
    setSessions((prev) => [session, ...prev])
  }

  const handleEdited = (updated: LiveSession) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await api.delete(`/sessions/${deleting.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSessions((prev) => prev.filter((s) => s.id !== deleting.id))
      setDeleting(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ink">
            Sesiones en vivo
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {sessions.length} {sessions.length === 1 ? 'sesión' : 'sesiones'} en total
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva sesión
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Total
              </p>
              <p className="font-headline text-2xl font-extrabold text-on-surface">{sessions.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <CalendarClock className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Próximas
              </p>
              <p className="font-headline text-2xl font-extrabold text-on-surface">{totalUpcoming}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <PlayCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Grabadas
              </p>
              <p className="font-headline text-2xl font-extrabold text-on-surface">{totalRecorded}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`rounded-xl px-4 py-2 font-headline text-sm font-bold transition-all duration-150 ${
              filter === opt.value
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-outline-variant bg-paper">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-on-surface-variant" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-on-surface-variant">
            <Radio className="h-10 w-10 opacity-30" />
            <p className="text-sm font-semibold">
              {filter === 'ALL' ? 'Todavía no hay sesiones.' : 'No hay sesiones con ese filtro.'}
            </p>
            {filter === 'ALL' && (
              <p className="text-xs opacity-60">Creá la primera con el botón de arriba.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Grabación</TableHead>
                <TableHead>Asistentes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="max-w-[300px]">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{s.title}</p>
                        <Badge variant="neutral" className="shrink-0 text-[9px]">
                          {TYPE_LABELS[s.type]}
                        </Badge>
                      </div>
                      {s.description && (
                        <p className="mt-0.5 truncate text-xs text-ink-muted">{s.description}</p>
                      )}
                      {s.duration != null && (
                        <p className="mt-0.5 text-xs text-ink-muted">{s.duration} min</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-ink">{formatDate(s.scheduledAt)}</p>
                      <p className="text-xs text-ink-muted">{formatTime(s.scheduledAt)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[s.status]}>
                      {STATUS_LABELS[s.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.recordingBunnyId ? (
                      <button
                        onClick={() => { setRecordingSession(s); setShowRecordingModal(true) }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <Film className="h-3 w-3" />
                        Grabada
                      </button>
                    ) : (
                      <button
                        onClick={() => { setRecordingSession(s); setShowRecordingModal(true) }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-outline-variant px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                      >
                        <UploadCloud className="h-3 w-3" />
                        Subir grabación
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-ink-muted">{s.attendees}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(s)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(s)}
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
      <NewSessionModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSuccess={handleCreated}
        token={token}
      />

      {editing && (
        <EditModal
          session={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
          onSuccess={handleEdited}
          token={token}
        />
      )}

      <DeleteDialog
        session={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />

      {recordingSession && (
        <RecordingUploadModal
          open={showRecordingModal}
          onClose={() => { setShowRecordingModal(false); setRecordingSession(null) }}
          session={recordingSession}
          onSuccess={(updated) => {
            setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
            setRecordingSession(updated)
          }}
          token={token}
        />
      )}
    </div>
  )
}

export default SesionesAdminPage
