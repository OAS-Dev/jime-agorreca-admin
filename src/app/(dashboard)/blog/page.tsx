'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  FileText,
  PenLine,
  Trash2,
  SquarePen,
  BookOpen,
  Lock,
  Globe,
  Zap,
  Loader2,
} from 'lucide-react'
import api from '@/lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// ── Types ─────────────────────────────────────────────────────────────────────

type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
type PostAccess = 'PUBLIC' | 'SUBSCRIBERS_ONLY'

interface PostSummary {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  status: PostStatus
  access: PostAccess
  tags: string[]
  publishedAt: string | null
  createdAt: string
  author: { id: string; name: string; image: string | null }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_FILTER_LABELS: { value: PostStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PUBLISHED', label: 'Publicadas' },
  { value: 'DRAFT', label: 'Borradores' },
  { value: 'ARCHIVED', label: 'Archivadas' },
]

const statusBadge = (status: PostStatus) => {
  const map: Record<PostStatus, { label: string; variant: 'success' | 'neutral' | 'error' }> = {
    PUBLISHED: { label: 'Publicada', variant: 'success' },
    DRAFT: { label: 'Borrador', variant: 'neutral' },
    ARCHIVED: { label: 'Archivada', variant: 'error' },
  }
  return map[status]
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonRow = () => {
  return (
    <TableRow className="animate-pulse hover:bg-transparent">
      <TableCell>
        <div className="flex items-center gap-4">
          <div className="h-10 w-16 shrink-0 rounded-xl bg-surface-container-high" />
          <div className="space-y-2">
            <div className="h-3.5 w-48 rounded-full bg-surface-container-high" />
            <div className="h-2.5 w-32 rounded-full bg-surface-container-high" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="h-6 w-20 rounded-full bg-surface-container-high" />
      </TableCell>
      <TableCell>
        <div className="h-6 w-24 rounded-full bg-surface-container-high" />
      </TableCell>
      <TableCell>
        <div className="h-3 w-20 rounded-full bg-surface-container-high" />
      </TableCell>
      <TableCell />
    </TableRow>
  )
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

interface DeleteDialogProps {
  post: PostSummary | null
  token: string
  onClose: () => void
  onDeleted: (id: string) => void
}

const DeleteDialog = ({ post, token, onClose, onDeleted }: DeleteDialogProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!post) {
      setError(null)
      setLoading(false)
    }
  }, [post])

  const handleDelete = async () => {
    if (!post) return
    setLoading(true)
    setError(null)
    try {
      await api.delete(`/posts/${post.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      onDeleted(post.id)
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Error al eliminar. Intentá de nuevo.',
      )
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={!!post}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar nota</DialogTitle>
          <DialogDescription>
            Estás por eliminar <strong>"{post?.title}"</strong>. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-8 pb-8">
          {error && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 font-body text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest hover:text-on-surface"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 bg-destructive text-white hover:bg-destructive/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const BlogPage = () => {
  const { data: session } = useSession()

  const [posts, setPosts] = useState<PostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<PostStatus | 'ALL'>('ALL')
  const [toDelete, setToDelete] = useState<PostSummary | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const params = filter !== 'ALL' ? `?status=${filter}` : ''
    api
      .get<PostSummary[]>(`/posts${params}`)
      .then(({ data }) => setPosts(data))
      .catch((err) =>
        setError(err?.response?.data?.message ?? err?.message ?? 'Error al cargar las notas'),
      )
      .finally(() => setLoading(false))
  }, [filter])

  const published = posts.filter((p) => p.status === 'PUBLISHED').length
  const drafts = posts.filter((p) => p.status === 'DRAFT').length

  const visible = filter === 'ALL' ? posts : posts.filter((p) => p.status === filter)

  return (
    <div className="space-y-10 p-10 xl:p-12">
      {/* Delete dialog */}
      {session?.backendToken && (
        <DeleteDialog
          post={toDelete}
          token={session.backendToken}
          onClose={() => setToDelete(null)}
          onDeleted={(id) => {
            setPosts((prev) => prev.filter((p) => p.id !== id))
            setToDelete(null)
          }}
        />
      )}

      {/* ── Header + métricas ───────────────────────────────────────────── */}
      <section className="grid grid-cols-1 items-end gap-8 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Notas del Blog
          </h2>
          <p className="font-body font-medium text-on-surface-variant">
            Gestioná el contenido público y exclusivo para suscriptores.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Publicadas */}
          <div className="group relative flex flex-col gap-1 overflow-hidden rounded-2xl bg-surface-container-lowest p-5 shadow-kinetic">
            <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-green-500/10 blur-2xl" />
            <p className="relative z-10 font-body text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Publicadas
            </p>
            <p className="relative z-10 font-headline text-4xl font-black text-on-surface">
              {loading ? (
                <span className="inline-block h-9 w-9 animate-pulse rounded-xl bg-surface-container-high" />
              ) : (
                published
              )}
            </p>
          </div>
          {/* Borradores */}
          <div className="group relative flex flex-col gap-1 overflow-hidden rounded-2xl bg-surface-container-lowest p-5 shadow-kinetic">
            <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-primary/10 blur-2xl" />
            <p className="relative z-10 font-body text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Borradores
            </p>
            <p className="relative z-10 font-headline text-4xl font-black text-on-surface">
              {loading ? (
                <span className="inline-block h-9 w-9 animate-pulse rounded-xl bg-surface-container-high" />
              ) : (
                drafts
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        {/* Filtros */}
        <div className="flex items-center gap-1 rounded-2xl bg-surface-container-low p-1">
          {STATUS_FILTER_LABELS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-xl px-4 py-2 font-body text-xs font-bold transition-all ${
                filter === value
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Link href="/blog/nuevo">
          <Button size="lg">
            <PenLine className="h-4 w-4" />
            Nueva nota
          </Button>
        </Link>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-kinetic">
        <Table>
          <TableHeader>
            <TableRow className="border-none bg-surface-container-low/50 hover:bg-surface-container-low/50">
              <TableHead>Nota</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acceso</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-16 text-center">
                  <p className="font-body text-sm font-semibold text-destructive">{error}</p>
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                    <FileText className="h-10 w-10 opacity-30" />
                    <p className="font-body text-sm font-semibold">No hay notas</p>
                    <Link href="/blog/nuevo">
                      <Button size="sm" variant="ghost" className="text-primary">
                        Crear la primera nota
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((post) => {
                const status = statusBadge(post.status)
                return (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        {/* Thumbnail */}
                        {post.coverImage ? (
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="h-10 w-16 shrink-0 rounded-xl object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08]">
                            <BookOpen className="h-4 w-4 text-primary/40" />
                          </div>
                        )}
                        <div>
                          <p className="line-clamp-1 max-w-xs font-body font-bold text-on-surface">
                            {post.title}
                          </p>
                          <p className="font-body text-xs font-medium text-on-surface-variant/60">
                            {post.author.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>

                    <TableCell>
                      {post.access === 'PUBLIC' ? (
                        <span className="flex items-center gap-1.5 font-body text-xs font-semibold text-on-surface-variant">
                          <Globe className="h-3.5 w-3.5" />
                          Pública
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 font-body text-xs font-bold text-primary">
                          <Lock className="h-3.5 w-3.5" />
                          Suscriptores
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="font-body text-sm font-medium text-on-surface-variant">
                      {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/blog/${post.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-on-surface-variant hover:text-primary"
                          >
                            <SquarePen className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl text-on-surface-variant hover:text-destructive"
                          onClick={() => setToDelete(post)}
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

        <div className="bg-surface-container-highest px-8 py-4">
          <p className="font-body text-sm font-semibold text-on-surface-variant">
            {loading ? '...' : `${visible.length} nota${visible.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </section>

      {/* ── Tip card ────────────────────────────────────────────────────── */}
      <div className="group relative overflow-hidden rounded-[2rem] bg-primary p-8 text-on-primary">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-150" />
        <div className="relative z-10 flex items-start gap-4">
          <Zap className="mt-0.5 h-6 w-6 shrink-0 fill-on-primary/20" />
          <div>
            <h4 className="mb-1 font-headline text-xl font-black">Contenido para suscriptores</h4>
            <p className="font-body text-sm leading-relaxed text-on-primary/80">
              Las notas marcadas como <strong>"Solo suscriptores"</strong> solo se muestran
              completas a usuarios con membresía activa. El título y el excerpt son siempre públicos
              para generar interés.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlogPage
