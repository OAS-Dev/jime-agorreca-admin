'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSession } from 'next-auth/react'
import {
  PlaySquare,
  UploadCloud,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Globe,
  Lock,
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
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ── Types ─────────────────────────────────────────────────────────────────────

type VideoStatus = 'PROCESSING' | 'READY' | 'ERROR'
type VideoAccess = 'PUBLIC' | 'SUBSCRIBERS_ONLY'

// ── Schemas ───────────────────────────────────────────────────────────────────

const uploadSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  access: z.enum(['PUBLIC', 'SUBSCRIBERS_ONLY']),
})

type UploadFormValues = z.infer<typeof uploadSchema>

const editSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  access: z.enum(['PUBLIC', 'SUBSCRIBERS_ONLY']),
})

type EditFormValues = z.infer<typeof editSchema>

interface Video {
  id: string
  title: string
  description: string | null
  bunnyVideoId: string
  thumbnailUrl: string | null
  duration: number | null
  access: VideoAccess
  status: VideoStatus
  embedUrl: string
  createdAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })

const STATUS_CONFIG: Record<VideoStatus, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  READY: { label: 'Listo', variant: 'success' },
  PROCESSING: { label: 'Procesando', variant: 'warning' },
  ERROR: { label: 'Error', variant: 'error' },
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <TableRow className="animate-pulse hover:bg-transparent">
    <TableCell>
      <div className="h-14 w-24 rounded-xl bg-surface-container-high" />
    </TableCell>
    <TableCell>
      <div className="space-y-2">
        <div className="h-3.5 w-48 rounded-full bg-surface-container-high" />
        <div className="h-2.5 w-32 rounded-full bg-surface-container-high" />
      </div>
    </TableCell>
    <TableCell>
      <div className="h-5 w-20 rounded-full bg-surface-container-high" />
    </TableCell>
    <TableCell>
      <div className="h-5 w-16 rounded-full bg-surface-container-high" />
    </TableCell>
    <TableCell>
      <div className="h-3.5 w-24 rounded-full bg-surface-container-high" />
    </TableCell>
    <TableCell>
      <div className="flex gap-2">
        <div className="h-8 w-8 rounded-lg bg-surface-container-high" />
        <div className="h-8 w-8 rounded-lg bg-surface-container-high" />
      </div>
    </TableCell>
  </TableRow>
)

// ── Upload Dialog ─────────────────────────────────────────────────────────────

const UploadDialog = ({
  open,
  onOpenChange,
  onUploaded,
  backendToken,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onUploaded: (video: Video) => void
  backendToken: string
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { title: '', description: '', access: 'SUBSCRIBERS_ONLY' },
  })

  const handleClose = () => {
    if (uploading) return
    form.reset()
    setFile(null)
    setProgress(0)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onOpenChange(false)
  }

  const onSubmit = async (data: UploadFormValues) => {
    if (!file) return

    setUploading(true)
    setError(null)
    setProgress(0)

    const formData = new FormData()
    formData.append('title', data.title.trim())
    if (data.description?.trim()) formData.append('description', data.description.trim())
    formData.append('access', data.access)
    formData.append('file', file)

    try {
      const { data: responseData } = await api.post<{ video: Video }>('/videos', formData, {
        headers: { Authorization: `Bearer ${backendToken}` },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded * 100) / evt.total))
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 0, // sin timeout para archivos grandes
      })
      onUploaded(responseData.video)
      form.reset()
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onOpenChange(false)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al subir el video'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir video</DialogTitle>
          <DialogDescription>
            El video se procesará en Bunny.net. El estado cambiará a "Listo" en unos minutos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-8 pb-8 pt-2">
            {/* File */}
            <div className="space-y-2">
              <p className="text-sm font-medium leading-none">Archivo de video *</p>
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-low p-8 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="h-8 w-8 text-on-surface-variant/50" />
                {file ? (
                  <p className="text-center font-body text-sm font-semibold text-on-surface">
                    {file.name}
                    <span className="ml-2 font-normal text-on-surface-variant">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </p>
                ) : (
                  <p className="font-body text-sm font-medium text-on-surface-variant">
                    Hacé click para seleccionar · MP4, MOV, WebM, MKV
                  </p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Estrategias de Meta Ads 2025"
                      disabled={uploading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descripción del contenido..."
                      disabled={uploading}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Access */}
            <FormField
              control={form.control}
              name="access"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acceso</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={uploading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SUBSCRIBERS_ONLY">Solo suscriptores</SelectItem>
                      <SelectItem value="PUBLIC">Público</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between font-body text-xs font-semibold text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Subiendo a Bunny.net...
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

            {error && <p className="font-body text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose} disabled={uploading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading || !file}>
                {uploading ? 'Subiendo...' : 'Subir video'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────

const EditDialog = ({
  video,
  onClose,
  onSaved,
  backendToken,
}: {
  video: Video | null
  onClose: () => void
  onSaved: (updated: Video) => void
  backendToken: string
}) => {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { title: '', description: '', access: 'SUBSCRIBERS_ONLY' },
  })

  useEffect(() => {
    if (video) {
      form.reset({
        title: video.title,
        description: video.description ?? '',
        access: video.access,
      })
      setError(null)
    }
  }, [video, form])

  const onSubmit = async (data: EditFormValues) => {
    if (!video) return
    setSaving(true)
    setError(null)
    try {
      const { data: responseData } = await api.patch<{ video: Video }>(
        `/videos/${video.id}`,
        { title: data.title.trim(), description: data.description?.trim(), access: data.access },
        { headers: { Authorization: `Bearer ${backendToken}` } },
      )
      onSaved(responseData.video)
      onClose()
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Error al guardar',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!video} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar video</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-8 pb-8 pt-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input disabled={saving} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea disabled={saving} rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="access"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acceso</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={saving}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SUBSCRIBERS_ONLY">Solo suscriptores</SelectItem>
                      <SelectItem value="PUBLIC">Público</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <p className="font-body text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete Dialog ─────────────────────────────────────────────────────────────

const DeleteDialog = ({
  video,
  onClose,
  onDeleted,
  backendToken,
}: {
  video: Video | null
  onClose: () => void
  onDeleted: (id: string) => void
  backendToken: string
}) => {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!video) return
    setDeleting(true)
    setError(null)
    try {
      await api.delete(`/videos/${video.id}`, {
        headers: { Authorization: `Bearer ${backendToken}` },
      })
      onDeleted(video.id)
      onClose()
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Error al eliminar',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={!!video} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Eliminar video?</DialogTitle>
          <DialogDescription>
            Se eliminará <strong>{video?.title}</strong> permanentemente de Bunny.net y la
            plataforma. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="px-8 font-body text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const VideosPage = () => {
  const { data: session } = useSession()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [toEdit, setToEdit] = useState<Video | null>(null)
  const [toDelete, setToDelete] = useState<Video | null>(null)

  useEffect(() => {
    if (!session?.backendToken) return
    setLoading(true)
    api
      .get<{ videos: Video[] }>('/videos', {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      })
      .then(({ data }) => setVideos(data.videos))
      .catch((err) =>
        setError(err?.response?.data?.message ?? err?.message ?? 'Error al cargar videos'),
      )
      .finally(() => setLoading(false))
  }, [session?.backendToken])

  const readyCount = videos.filter((v) => v.status === 'READY').length
  const processingCount = videos.filter((v) => v.status === 'PROCESSING').length

  return (
    <div className="space-y-10 p-4 sm:p-6 lg:p-10 xl:p-12">
      <UploadDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        backendToken={session?.backendToken ?? ''}
        onUploaded={(video) => setVideos((prev) => [video, ...prev])}
      />
      <EditDialog
        video={toEdit}
        onClose={() => setToEdit(null)}
        onSaved={(updated) =>
          setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
        }
        backendToken={session?.backendToken ?? ''}
      />
      <DeleteDialog
        video={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={(id) => setVideos((prev) => prev.filter((v) => v.id !== id))}
        backendToken={session?.backendToken ?? ''}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Videoteca
          </h2>
          <p className="font-body font-medium text-on-surface-variant">
            Gestioná los videos del dashboard de suscriptores.
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="gap-2">
          <UploadCloud className="h-4 w-4" />
          Subir video
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total', value: videos.length, icon: Film },
          { label: 'Listos', value: readyCount, icon: CheckCircle2 },
          { label: 'Procesando', value: processingCount, icon: Loader2 },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center justify-between overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-kinetic"
          >
            <div className="space-y-1">
              <p className="font-body text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {label}
              </p>
              <h3 className="font-headline text-4xl font-black text-on-surface">
                {loading ? (
                  <span className="inline-block h-10 w-14 animate-pulse rounded-xl bg-surface-container-high" />
                ) : (
                  value
                )}
              </h3>
            </div>
            <div className="rounded-2xl bg-primary/10 p-4">
              <Icon className="h-7 w-7 text-primary" />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-kinetic">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-none bg-surface-container-low/50 hover:bg-surface-container-low/50">
              <TableHead>Miniatura</TableHead>
              <TableHead>Video</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acceso</TableHead>
              <TableHead>Subido</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-16 text-center">
                  <p className="font-body text-sm font-semibold text-destructive">{error}</p>
                </TableCell>
              </TableRow>
            ) : videos.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                    <PlaySquare className="h-10 w-10 opacity-30" />
                    <p className="font-body text-sm font-semibold">No hay videos aún</p>
                    <Button size="sm" onClick={() => setShowUpload(true)}>
                      Subir el primer video
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              videos.map((video) => {
                const statusCfg = STATUS_CONFIG[video.status]
                return (
                  <TableRow key={video.id}>
                    {/* Thumbnail */}
                    <TableCell>
                      {video.thumbnailUrl && video.status === 'READY' ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="h-14 w-24 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-24 items-center justify-center rounded-xl bg-primary/[0.08]">
                          <Film className="h-6 w-6 text-primary/40" />
                        </div>
                      )}
                    </TableCell>

                    {/* Title + description */}
                    <TableCell className="max-w-xs">
                      <p className="font-body font-bold text-on-surface">{video.title}</p>
                      {video.description && (
                        <p className="mt-0.5 line-clamp-1 font-body text-xs text-on-surface-variant">
                          {video.description}
                        </p>
                      )}
                      {video.duration && (
                        <p className="mt-1 font-body text-[11px] text-on-surface-variant/70">
                          {formatDuration(video.duration)}
                        </p>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    </TableCell>

                    {/* Access */}
                    <TableCell>
                      <span className="flex items-center gap-1.5 font-body text-sm text-on-surface-variant">
                        {video.access === 'PUBLIC' ? (
                          <>
                            <Globe className="h-3.5 w-3.5" />
                            Público
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            Suscriptores
                          </>
                        )}
                      </span>
                    </TableCell>

                    {/* Date */}
                    <TableCell>
                      <span className="font-body text-sm text-on-surface-variant">
                        {formatDate(video.createdAt)}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-primary/[0.08] hover:text-primary"
                          onClick={() => setToEdit(video)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-destructive/[0.08] hover:text-destructive"
                          onClick={() => setToDelete(video)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        </div>
      </section>
    </div>
  )
}

export default VideosPage
