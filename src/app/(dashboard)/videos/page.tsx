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
  ImageIcon,
  RefreshCw,
  GripVertical,
  ArrowUpDown,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

interface Category {
  id: string
  name: string
  order: number
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const uploadSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  access: z.enum(['PUBLIC', 'SUBSCRIBERS_ONLY']),
  categoryId: z.string().optional(),
})

type UploadFormValues = z.infer<typeof uploadSchema>

const editSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  access: z.enum(['PUBLIC', 'SUBSCRIBERS_ONLY']),
  categoryId: z.string().optional(),
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
  categoryId: string | null
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
      <div className="h-5 w-24 rounded-full bg-surface-container-high" />
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
  categories,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onUploaded: (video: Video) => void
  backendToken: string
  categories: Category[]
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState<'video' | 'thumbnail' | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { title: '', description: '', access: 'SUBSCRIBERS_ONLY', categoryId: '__none__' },
  })

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setThumbnailFile(f)
    if (f) {
      const reader = new FileReader()
      reader.onload = (ev) => setThumbnailPreview(ev.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setThumbnailPreview(null)
    }
  }

  const handleClose = () => {
    if (uploading) return
    form.reset()
    setFile(null)
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setProgress(0)
    setUploadStep(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ''
    onOpenChange(false)
  }

  const onSubmit = async (data: UploadFormValues) => {
    if (!file) return

    setUploading(true)
    setError(null)
    setProgress(0)
    setUploadStep('video')

    const formData = new FormData()
    formData.append('title', data.title.trim())
    if (data.description?.trim()) formData.append('description', data.description.trim())
    formData.append('access', data.access)
    const catId = data.categoryId?.trim()
    if (catId && catId !== '__none__') formData.append('categoryId', catId)
    formData.append('file', file)

    try {
      const { data: responseData } = await api.post<{ video: Video }>('/videos', formData, {
        headers: { Authorization: `Bearer ${backendToken}` },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded * 100) / evt.total))
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 0,
      })

      let finalVideo = responseData.video

      // If thumbnail was selected, upload it right after
      if (thumbnailFile) {
        setUploadStep('thumbnail')
        setProgress(0)
        const thumbForm = new FormData()
        thumbForm.append('thumbnail', thumbnailFile)
        try {
          const { data: thumbData } = await api.patch<{ video: Video }>(
            `/videos/${finalVideo.id}/thumbnail`,
            thumbForm,
            { headers: { Authorization: `Bearer ${backendToken}` } },
          )
          finalVideo = thumbData.video
        } catch {
          // Thumbnail upload failed but video was created — non-fatal
        }
      }

      onUploaded(finalVideo)
      form.reset()
      setFile(null)
      setThumbnailFile(null)
      setThumbnailPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = ''
      onOpenChange(false)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al subir el video'
      setError(msg)
    } finally {
      setUploading(false)
      setUploadStep(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="px-8 pt-8">
          <DialogTitle>Subir video</DialogTitle>
          <DialogDescription>
            El video se procesará en Bunny.net. El estado cambiará a "Listo" en unos minutos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-8 pb-8 pt-4">
            {/* Two-column grid: files left, metadata right */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

              {/* ── Left col: file pickers ── */}
              <div className="space-y-4">
                {/* Video file */}
                <div className="space-y-2">
                  <p className="text-sm font-medium leading-none">Archivo de video *</p>
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-low p-6 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                    style={{ minHeight: '140px' }}
                    onClick={() => fileInputRef.current?.click()}
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
                        <span className="text-xs opacity-60">MP4, MOV, WebM, MKV</span>
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

                {/* Thumbnail */}
                <div className="space-y-2">
                  <p className="text-sm font-medium leading-none">
                    Thumbnail{' '}
                    <span className="font-normal text-on-surface-variant">(opcional)</span>
                  </p>
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-low transition-colors hover:border-primary/40 hover:bg-primary/[0.03] overflow-hidden"
                    onClick={() => thumbnailInputRef.current?.click()}
                  >
                    {thumbnailPreview ? (
                      <img
                        src={thumbnailPreview}
                        alt="preview"
                        className="w-full aspect-video object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/[0.08]">
                          <ImageIcon className="h-6 w-6 text-primary/40" />
                        </div>
                        <p className="text-center font-body text-sm font-medium text-on-surface-variant">
                          Hacé click para seleccionar
                          <br />
                          <span className="text-xs opacity-60">JPG, PNG o WebP · máx. 5 MB</span>
                        </p>
                      </div>
                    )}
                    {thumbnailFile && (
                      <p className="pb-2 font-body text-xs text-on-surface-variant">
                        {thumbnailFile.name}
                      </p>
                    )}
                  </div>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleThumbnailChange}
                  />
                </div>
              </div>

              {/* ── Right col: metadata ── */}
              <div className="space-y-4">
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

                {/* Category */}
                {categories.length > 0 && (
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Categoría{' '}
                          <span className="font-normal text-on-surface-variant">(opcional)</span>
                        </FormLabel>
                        <Select value={field.value ?? '__none__'} onValueChange={field.onChange} disabled={uploading}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sin categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Sin categoría</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
              </div>
            </div>

            {/* Progress */}
            {uploading && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between font-body text-xs font-semibold text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {uploadStep === 'thumbnail' ? 'Subiendo thumbnail...' : 'Subiendo video a Bunny.net...'}
                  </span>
                  {uploadStep === 'video' && <span>{progress}%</span>}
                </div>
                {uploadStep === 'video' && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {error && <p className="mt-4 font-body text-xs text-destructive">{error}</p>}

            <DialogFooter className="mt-6">
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
  categories,
}: {
  video: Video | null
  onClose: () => void
  onSaved: (updated: Video) => void
  backendToken: string
  categories: Category[]
}) => {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { title: '', description: '', access: 'SUBSCRIBERS_ONLY', categoryId: '__none__' },
  })

  useEffect(() => {
    if (video) {
      form.reset({
        title: video.title,
        description: video.description ?? '',
        access: video.access,
        categoryId: video.categoryId ?? '__none__',
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
        {
          title: data.title.trim(),
          description: data.description?.trim(),
          access: data.access,
          categoryId: data.categoryId && data.categoryId !== '__none__' ? data.categoryId : null,
        },
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

            {/* Category */}
            {categories.length > 0 && (
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={saving}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Sin categoría</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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

// ── Thumbnail Dialog ──────────────────────────────────────────────────────────

const ThumbnailDialog = ({
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
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!video) {
      setThumbnailFile(null)
      setThumbnailPreview(null)
      setError(null)
    }
  }, [video])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setThumbnailFile(f)
    if (f) {
      const reader = new FileReader()
      reader.onload = (ev) => setThumbnailPreview(ev.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setThumbnailPreview(null)
    }
  }

  const handleSave = async () => {
    if (!video || !thumbnailFile) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('thumbnail', thumbnailFile)
      const { data } = await api.patch<{ video: Video }>(
        `/videos/${video.id}/thumbnail`,
        formData,
        { headers: { Authorization: `Bearer ${backendToken}` } },
      )
      onSaved(data.video)
      onClose()
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Error al actualizar el thumbnail',
      )
    } finally {
      setUploading(false)
    }
  }

  const currentThumb = thumbnailPreview ?? video?.thumbnailUrl ?? null

  return (
    <Dialog open={!!video} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar thumbnail</DialogTitle>
          <DialogDescription>
            Seleccioná una imagen para reemplazar el thumbnail actual de <strong>{video?.title}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 pb-8 pt-2 space-y-5">
          {/* Current / preview */}
          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-low p-4 transition-colors hover:border-primary/40"
            onClick={() => inputRef.current?.click()}
          >
            {currentThumb ? (
              <img
                src={currentThumb}
                alt="thumbnail"
                className="w-full aspect-video rounded-xl object-cover"
              />
            ) : (
              <div className="flex w-full aspect-video items-center justify-center rounded-xl bg-primary/[0.08]">
                <ImageIcon className="h-10 w-10 text-primary/30" />
              </div>
            )}
            <p className="font-body text-xs text-on-surface-variant">
              {thumbnailFile ? thumbnailFile.name : 'Hacé click para seleccionar imagen'}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {error && <p className="font-body text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={uploading || !thumbnailFile}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                'Guardar thumbnail'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Reorder Dialog ────────────────────────────────────────────────────────────

const SortableVideoRow = ({ video }: { video: Video }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: video.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="flex items-center gap-3 rounded-xl bg-surface-container-lowest px-3 py-2.5 shadow-sm"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-on-surface-variant/40 hover:text-on-surface-variant active:cursor-grabbing"
        tabIndex={-1}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Thumbnail */}
      {video.thumbnailUrl && video.status === 'READY' ? (
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="h-10 w-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08]">
          <Film className="h-4 w-4 text-primary/40" />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-sm font-semibold text-on-surface">{video.title}</p>
        {video.duration && (
          <p className="font-body text-[11px] text-on-surface-variant">{formatDuration(video.duration)}</p>
        )}
      </div>
    </div>
  )
}

const ReorderDialog = ({
  open,
  onOpenChange,
  videos,
  categories,
  backendToken,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  videos: Video[]
  categories: Category[]
  backendToken: string
  onSaved: (items: { id: string; order: number }[]) => void
}) => {
  // Local state: map of categoryId (or '__none__') → ordered video list
  const [groups, setGroups] = useState<Map<string, Video[]>>(new Map())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Build groups when dialog opens
  useEffect(() => {
    if (!open) return
    const map = new Map<string, Video[]>()
    // Add a group per category (in category order)
    categories.forEach((cat) => {
      map.set(
        cat.id,
        videos
          .filter((v) => v.categoryId === cat.id)
          .sort((a, b) => a.order - b.order || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      )
    })
    // Sin categoría
    const uncategorized = videos
      .filter((v) => !v.categoryId)
      .sort((a, b) => a.order - b.order || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    if (uncategorized.length > 0) map.set('__none__', uncategorized)
    setGroups(map)
    setError(null)
  }, [open, videos, categories])

  const handleDragEnd = (groupKey: string, event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setGroups((prev) => {
      const group = prev.get(groupKey) ?? []
      const oldIndex = group.findIndex((v) => v.id === active.id)
      const newIndex = group.findIndex((v) => v.id === over.id)
      const next = new Map(prev)
      next.set(groupKey, arrayMove(group, oldIndex, newIndex))
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const items: { id: string; order: number }[] = []
    groups.forEach((groupVideos) => {
      groupVideos.forEach((v, i) => items.push({ id: v.id, order: i }))
    })
    try {
      await api.patch('/videos/reorder', { items }, {
        headers: { Authorization: `Bearer ${backendToken}` },
      })
      onSaved(items)
      onOpenChange(false)
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Error al guardar el orden',
      )
    } finally {
      setSaving(false)
    }
  }

  // Build ordered section list: categories in order, then __none__
  const sections: { key: string; label: string }[] = [
    ...categories
      .filter((cat) => (groups.get(cat.id)?.length ?? 0) > 0)
      .map((cat) => ({ key: cat.id, label: cat.name })),
    ...(groups.get('__none__')?.length ? [{ key: '__none__', label: 'Sin categoría' }] : []),
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v) }}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>Reordenar videos</DialogTitle>
          <DialogDescription>
            Arrastrá los videos para definir el orden en que aparecen en cada categoría.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-1 py-2">
          {sections.length === 0 ? (
            <p className="py-8 text-center font-body text-sm text-on-surface-variant">
              No hay videos para reordenar.
            </p>
          ) : (
            sections.map(({ key, label }) => {
              const group = groups.get(key) ?? []
              return (
                <div key={key}>
                  <p className="mb-2 px-1 font-body text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                    {label} · {group.length} {group.length === 1 ? 'video' : 'videos'}
                  </p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(key, e)}
                  >
                    <SortableContext items={group.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {group.map((video) => (
                          <SortableVideoRow key={video.id} video={video} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )
            })
          )}
        </div>

        {error && <p className="shrink-0 px-1 font-body text-xs text-destructive">{error}</p>}

        <DialogFooter className="shrink-0 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || sections.length === 0}>
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
            ) : (
              'Guardar orden'
            )}
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
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showReorder, setShowReorder] = useState(false)
  const [toEdit, setToEdit] = useState<Video | null>(null)
  const [toDelete, setToDelete] = useState<Video | null>(null)
  const [toSetThumbnail, setToSetThumbnail] = useState<Video | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const handleSync = async (video: Video) => {
    if (!session?.backendToken || syncingId) return
    setSyncingId(video.id)
    try {
      const { data } = await api.post<{ video: Video }>(
        `/videos/${video.id}/sync`,
        {},
        { headers: { Authorization: `Bearer ${session.backendToken}` } },
      )
      setVideos((prev) => prev.map((v) => (v.id === data.video.id ? data.video : v)))
    } catch {
      // ignore — UI doesn't need to show an error for sync
    } finally {
      setSyncingId(null)
    }
  }

  useEffect(() => {
    if (!session?.backendToken) return
    const headers = { Authorization: `Bearer ${session.backendToken}` }
    setLoading(true)
    Promise.all([
      api.get<{ videos: Video[] }>('/videos', { headers }),
      api.get<{ categories: Category[] }>('/categories', { headers }),
    ])
      .then(([videosRes, catsRes]) => {
        setVideos(videosRes.data.videos)
        setCategories(catsRes.data.categories)
      })
      .catch((err) =>
        setError(err?.response?.data?.message ?? err?.message ?? 'Error al cargar datos'),
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
        categories={categories}
        onUploaded={(video) => setVideos((prev) => [video, ...prev])}
      />
      <EditDialog
        video={toEdit}
        onClose={() => setToEdit(null)}
        onSaved={(updated) =>
          setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
        }
        backendToken={session?.backendToken ?? ''}
        categories={categories}
      />
      <DeleteDialog
        video={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={(id) => setVideos((prev) => prev.filter((v) => v.id !== id))}
        backendToken={session?.backendToken ?? ''}
      />
      <ThumbnailDialog
        video={toSetThumbnail}
        onClose={() => setToSetThumbnail(null)}
        onSaved={(updated) =>
          setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
        }
        backendToken={session?.backendToken ?? ''}
      />
      <ReorderDialog
        open={showReorder}
        onOpenChange={setShowReorder}
        videos={videos}
        categories={categories}
        backendToken={session?.backendToken ?? ''}
        onSaved={(items) => {
          // Actualiza el campo order en el estado local para que la tabla refleje el nuevo orden
          const orderMap = new Map(items.map(({ id, order }) => [id, order]))
          setVideos((prev) =>
            [...prev]
              .map((v) => ({ ...v, order: orderMap.get(v.id) ?? v.order }))
              .sort((a, b) => a.order - b.order),
          )
        }}
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowReorder(true)}
            disabled={videos.length === 0}
            className="gap-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            Reordenar
          </Button>
          <Button onClick={() => setShowUpload(true)} className="gap-2">
            <UploadCloud className="h-4 w-4" />
            Subir video
          </Button>
        </div>
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
              <TableHead>Categoría</TableHead>
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
                <TableCell colSpan={7} className="py-16 text-center">
                  <p className="font-body text-sm font-semibold text-destructive">{error}</p>
                </TableCell>
              </TableRow>
            ) : videos.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-20 text-center">
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

                    {/* Category */}
                    <TableCell>
                      {video.categoryId ? (
                        <Badge variant="warning">
                          {categories.find((c) => c.id === video.categoryId)?.name ?? '—'}
                        </Badge>
                      ) : (
                        <span className="font-body text-xs text-on-surface-variant/50">—</span>
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
                        {/* Sync from Bunny — only for non-READY videos */}
                        {video.status !== 'READY' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg hover:bg-primary/[0.08] hover:text-primary"
                            onClick={() => handleSync(video)}
                            disabled={syncingId === video.id}
                            title="Sincronizar estado con Bunny.net"
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${syncingId === video.id ? 'animate-spin' : ''}`}
                            />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-primary/[0.08] hover:text-primary"
                          onClick={() => setToSetThumbnail(video)}
                          title="Cambiar thumbnail"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-primary/[0.08] hover:text-primary"
                          onClick={() => setToEdit(video)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-destructive/[0.08] hover:text-destructive"
                          onClick={() => setToDelete(video)}
                          title="Eliminar"
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
