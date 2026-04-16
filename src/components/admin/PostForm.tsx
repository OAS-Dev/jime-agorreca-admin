'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Globe, Lock, Loader2, Link2, Tag, ImageIcon, UploadCloud } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

// ── Types ─────────────────────────────────────────────────────────────────────

type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
type PostAccess = 'PUBLIC' | 'SUBSCRIBERS_ONLY'

export interface PostFormData {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  status: PostStatus
  access: PostAccess
  tags: string[]
}

interface PostFormProps {
  mode: 'create' | 'edit'
  postId?: string
  initialData?: Partial<PostFormData>
}

// ── Slug generation ───────────────────────────────────────────────────────────

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

// ── Tags input ────────────────────────────────────────────────────────────────

const TagsInput = ({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) => {
  const [input, setInput] = useState('')

  const addTag = (value: string) => {
    const cleaned = value.trim().toLowerCase()
    if (cleaned && !tags.includes(cleaned)) onChange([...tags, cleaned])
    setInput('')
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex min-h-[44px] flex-wrap gap-2 rounded-2xl bg-surface-container-low px-3 py-2.5 transition-all focus-within:ring-2 focus-within:ring-primary/30">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-body text-xs font-bold text-primary"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="leading-none transition-colors hover:text-primary/60"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => {
          if (input.trim()) addTag(input)
        }}
        placeholder={tags.length === 0 ? 'Escribí un tag y presioná Enter' : ''}
        className="min-w-[120px] flex-1 bg-transparent font-body text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/50"
      />
    </div>
  )
}

// ── CoverImageUpload ──────────────────────────────────────────────────────────

interface CoverImageUploadProps {
  value: string
  onChange: (url: string) => void
  backendToken: string
}

const CoverImageUpload = ({ value, onChange, backendToken }: CoverImageUploadProps) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(
    async (file: File) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!allowed.includes(file.type)) {
        setError('Solo se permiten imágenes JPG, PNG, WebP o GIF.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no puede superar los 5MB.')
        return
      }

      setError(null)
      setUploading(true)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/upload/image?folder=posts`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${backendToken}` },
            body: formData,
          },
        )

        const data = await res.json()

        if (!res.ok) {
          setError(data.message ?? 'Error al subir la imagen')
        } else {
          onChange(data.url)
        }
      } catch {
        setError('Error al subir la imagen')
      } finally {
        setUploading(false)
      }
    },
    [backendToken, onChange],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="space-y-3">
          <div className="aspect-video overflow-hidden rounded-xl">
            <img
              src={value}
              alt="Cover preview"
              className="h-full w-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            >
              Cambiar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange('')}
              className="flex-1 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            >
              Quitar
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
          }}
          className={[
            'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors select-none',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-outline-variant bg-surface-container-low hover:border-primary/50 hover:bg-primary/5',
          ].join(' ')}
        >
          {uploading ? (
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-on-surface-variant/50" />
              <div>
                <p className="font-body text-sm font-semibold text-on-surface-variant">
                  Arrastrá una imagen
                </p>
                <p className="font-body text-xs text-on-surface-variant/60">
                  o hacé click para elegir
                </p>
              </div>
              <p className="font-body text-[10px] font-medium text-on-surface-variant/40">
                JPG · PNG · WebP · GIF · 5MB
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="font-body text-xs font-semibold text-destructive">{error}</p>
      )}
    </div>
  )
}

// ── PostForm ──────────────────────────────────────────────────────────────────

const PostForm = ({ mode, postId, initialData }: PostFormProps) => {
  const { data: session } = useSession()
  const router = useRouter()

  const [form, setForm] = useState<PostFormData>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: '',
    status: 'DRAFT',
    access: 'PUBLIC',
    tags: [],
    ...initialData,
  })
  const [slugManual, setSlugManual] = useState(!!initialData?.slug)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // Focus title on mount
  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((f) => ({ ...f, slug: slugify(form.title) }))
    }
  }, [form.title, slugManual])

  const set = <K extends keyof PostFormData>(key: K, value: PostFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent, publishNow?: boolean) => {
    e.preventDefault()
    if (!session?.backendToken) return
    setError(null)
    setSubmitting(true)

    const payload = {
      ...form,
      excerpt: form.excerpt || undefined,
      coverImage: form.coverImage || undefined,
      status: publishNow ? ('PUBLISHED' as PostStatus) : form.status,
    }

    try {
      if (mode === 'create') {
        await api.post('/posts', payload, {
          headers: { Authorization: `Bearer ${session.backendToken}` },
        })
      } else {
        await api.patch(`/posts/${postId}`, payload, {
          headers: { Authorization: `Bearer ${session.backendToken}` },
        })
      }
      router.push('/blog')
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Ocurrió un error. Intentá de nuevo.',
      )
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="min-h-screen bg-background">
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-surface-container-high/50 bg-surface-container-lowest/80 px-8 py-4 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Link href="/blog">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-xl text-on-surface-variant"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <p className="font-body text-xs font-black uppercase tracking-widest text-on-surface-variant">
                {mode === 'create' ? 'Nueva nota' : 'Editando nota'}
              </p>
              {form.status === 'DRAFT' && (
                <p className="font-body text-[10px] font-semibold text-on-surface-variant/50">
                  Borrador sin guardar
                </p>
              )}
              {form.status === 'PUBLISHED' && (
                <p className="font-body text-[10px] font-semibold text-green-600">Publicada</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {error && <p className="font-body text-xs font-semibold text-destructive">{error}</p>}
            {/* Guardar borrador */}
            <Button
              type="button"
              variant="ghost"
              disabled={submitting || !form.title || !form.content}
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, false)}
              className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest hover:text-on-surface"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar borrador'}
            </Button>
            {/* Publicar */}
            {form.status !== 'PUBLISHED' && (
              <Button
                type="button"
                disabled={submitting || !form.title || !form.content}
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publicar'}
              </Button>
            )}
            {/* Guardar cambios (modo edit publicada) */}
            {form.status === 'PUBLISHED' && mode === 'edit' && (
              <Button
                type="button"
                disabled={submitting || !form.title || !form.content}
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent, false)}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cambios'}
              </Button>
            )}
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-8 py-10 lg:grid-cols-3">
          {/* Left: content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Title */}
            <input
              ref={titleRef}
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Título de la nota..."
              required
              className="w-full resize-none bg-transparent font-headline text-4xl font-black leading-tight text-on-surface outline-none placeholder:text-on-surface-variant/30"
            />

            {/* Slug */}
            <div className="group flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-on-surface-variant/40" />
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setSlugManual(true)
                  set('slug', e.target.value)
                }}
                placeholder="slug-de-la-nota"
                className="flex-1 bg-transparent font-body text-sm font-medium text-on-surface-variant outline-none placeholder:text-on-surface-variant/30"
              />
              {slugManual && (
                <button
                  type="button"
                  onClick={() => {
                    setSlugManual(false)
                    set('slug', slugify(form.title))
                  }}
                  className="font-body text-[10px] font-bold text-primary transition-colors hover:text-primary/70"
                >
                  Auto
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-surface-container-high" />

            {/* Excerpt */}
            <div className="space-y-2">
              <Label className="font-body text-xs font-black uppercase tracking-widest text-on-surface-variant/60">
                Resumen (excerpt)
              </Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => set('excerpt', e.target.value)}
                placeholder="Breve descripción que aparece en el listado del blog..."
                className="min-h-[80px] text-base leading-relaxed"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label className="font-body text-xs font-black uppercase tracking-widest text-on-surface-variant/60">
                Contenido (Markdown)
              </Label>
              <Textarea
                value={form.content}
                onChange={(e) => set('content', e.target.value)}
                placeholder="# Título&#10;&#10;Escribí el contenido de la nota en Markdown..."
                required
                className="min-h-[480px] font-mono text-sm leading-relaxed"
              />
            </div>
          </div>

          {/* Right: sidebar metadata */}
          <div className="space-y-5">
            {/* Estado */}
            <div className="space-y-4 rounded-[1.5rem] bg-surface-container-lowest p-6 shadow-kinetic">
              <h3 className="font-body text-xs font-black uppercase tracking-widest text-on-surface-variant">
                Estado
              </h3>
              <Select value={form.status} onValueChange={(v) => set('status', v as PostStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Borrador</SelectItem>
                  <SelectItem value="PUBLISHED">Publicada</SelectItem>
                  <SelectItem value="ARCHIVED">Archivada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Acceso */}
            <div className="space-y-4 rounded-[1.5rem] bg-surface-container-lowest p-6 shadow-kinetic">
              <h3 className="font-body text-xs font-black uppercase tracking-widest text-on-surface-variant">
                Acceso
              </h3>
              <div className="flex items-start gap-4">
                <Switch
                  checked={form.access === 'SUBSCRIBERS_ONLY'}
                  onCheckedChange={(checked) =>
                    set('access', checked ? 'SUBSCRIBERS_ONLY' : 'PUBLIC')
                  }
                />
                <div>
                  {form.access === 'PUBLIC' ? (
                    <>
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-on-surface-variant" />
                        <span className="font-body text-sm font-bold text-on-surface">Pública</span>
                      </div>
                      <p className="font-body text-xs leading-snug text-on-surface-variant/70">
                        Visible para todos los visitantes.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-primary" />
                        <span className="font-body text-sm font-bold text-primary">
                          Solo suscriptores
                        </span>
                      </div>
                      <p className="font-body text-xs leading-snug text-on-surface-variant/70">
                        El contenido completo solo es accesible con membresía activa.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Cover image */}
            <div className="space-y-3 rounded-[1.5rem] bg-surface-container-lowest p-6 shadow-kinetic">
              <h3 className="flex items-center gap-2 font-body text-xs font-black uppercase tracking-widest text-on-surface-variant">
                <ImageIcon className="h-3.5 w-3.5" />
                Imagen de portada
              </h3>
              <CoverImageUpload
                value={form.coverImage}
                onChange={(url) => set('coverImage', url)}
                backendToken={session?.backendToken ?? ''}
              />
            </div>

            {/* Tags */}
            <div className="space-y-4 rounded-[1.5rem] bg-surface-container-lowest p-6 shadow-kinetic">
              <h3 className="flex items-center gap-2 font-body text-xs font-black uppercase tracking-widest text-on-surface-variant">
                <Tag className="h-3.5 w-3.5" />
                Tags
              </h3>
              <TagsInput tags={form.tags} onChange={(tags) => set('tags', tags)} />
              <p className="font-body text-[10px] text-on-surface-variant/50">
                Presioná Enter o coma para agregar
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

export default PostForm
