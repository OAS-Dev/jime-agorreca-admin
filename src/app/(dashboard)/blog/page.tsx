'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
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
} from 'lucide-react';
import api from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ── Types ─────────────────────────────────────────────────────────────────────

type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type PostAccess = 'PUBLIC' | 'SUBSCRIBERS_ONLY';

interface PostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  status: PostStatus;
  access: PostAccess;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_FILTER_LABELS: { value: PostStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PUBLISHED', label: 'Publicadas' },
  { value: 'DRAFT', label: 'Borradores' },
  { value: 'ARCHIVED', label: 'Archivadas' },
];

const statusBadge = (status: PostStatus) => {
  const map: Record<PostStatus, { label: string; variant: 'success' | 'neutral' | 'error' }> = {
    PUBLISHED: { label: 'Publicada', variant: 'success' },
    DRAFT: { label: 'Borrador', variant: 'neutral' },
    ARCHIVED: { label: 'Archivada', variant: 'error' },
  };
  return map[status];
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow className='animate-pulse hover:bg-transparent'>
      <TableCell>
        <div className='flex items-center gap-4'>
          <div className='w-16 h-10 rounded-xl bg-surface-container-high shrink-0' />
          <div className='space-y-2'>
            <div className='h-3.5 w-48 bg-surface-container-high rounded-full' />
            <div className='h-2.5 w-32 bg-surface-container-high rounded-full' />
          </div>
        </div>
      </TableCell>
      <TableCell><div className='h-6 w-20 bg-surface-container-high rounded-full' /></TableCell>
      <TableCell><div className='h-6 w-24 bg-surface-container-high rounded-full' /></TableCell>
      <TableCell><div className='h-3 w-20 bg-surface-container-high rounded-full' /></TableCell>
      <TableCell />
    </TableRow>
  );
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

interface DeleteDialogProps {
  post: PostSummary | null;
  token: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteDialog({ post, token, onClose, onDeleted }: DeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!post) { setError(null); setLoading(false); }
  }, [post]);

  const handleDelete = async () => {
    if (!post) return;
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/posts/${post.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted(post.id);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al eliminar. Intentá de nuevo.',
      );
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!post} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar nota</DialogTitle>
          <DialogDescription>
            Estás por eliminar <strong>"{post?.title}"</strong>. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <div className='px-8 pb-8 space-y-4'>
          {error && (
            <p className='text-sm font-body font-semibold text-destructive bg-destructive/10 rounded-2xl px-4 py-3'>
              {error}
            </p>
          )}
          <div className='flex gap-3'>
            <Button
              variant='ghost'
              onClick={onClose}
              disabled={loading}
              className='flex-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest hover:text-on-surface'
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              className='flex-1 bg-destructive hover:bg-destructive/90 text-white'
            >
              {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Eliminar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BlogPage() {
  const { data: session } = useSession();

  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PostStatus | 'ALL'>('ALL');
  const [toDelete, setToDelete] = useState<PostSummary | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = filter !== 'ALL' ? `?status=${filter}` : '';
    api
      .get<PostSummary[]>(`/posts${params}`)
      .then(({ data }) => setPosts(data))
      .catch((err) => setError(err?.response?.data?.message ?? err?.message ?? 'Error al cargar las notas'))
      .finally(() => setLoading(false));
  }, [filter]);

  const published = posts.filter((p) => p.status === 'PUBLISHED').length;
  const drafts = posts.filter((p) => p.status === 'DRAFT').length;

  const visible = filter === 'ALL' ? posts : posts.filter((p) => p.status === filter);

  return (
    <div className='p-8 max-w-6xl mx-auto space-y-10'>

      {/* Delete dialog */}
      {session?.backendToken && (
        <DeleteDialog
          post={toDelete}
          token={session.backendToken}
          onClose={() => setToDelete(null)}
          onDeleted={(id) => {
            setPosts((prev) => prev.filter((p) => p.id !== id));
            setToDelete(null);
          }}
        />
      )}

      {/* ── Header + métricas ───────────────────────────────────────────── */}
      <section className='grid grid-cols-1 md:grid-cols-3 gap-8 items-end'>
        <div className='md:col-span-2 space-y-2'>
          <h2 className='text-4xl font-headline font-extrabold tracking-tight text-on-surface'>
            Notas del Blog
          </h2>
          <p className='text-on-surface-variant font-body font-medium'>
            Gestioná el contenido público y exclusivo para suscriptores.
          </p>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          {/* Publicadas */}
          <div className='bg-surface-container-lowest p-5 rounded-2xl shadow-kinetic flex flex-col gap-1 relative overflow-hidden group'>
            <div className='absolute -right-3 -top-3 w-16 h-16 bg-green-500/10 rounded-full blur-2xl' />
            <p className='text-[10px] font-body font-black uppercase tracking-widest text-on-surface-variant relative z-10'>Publicadas</p>
            <p className='text-4xl font-headline font-black text-on-surface relative z-10'>
              {loading ? <span className='inline-block h-9 w-9 bg-surface-container-high rounded-xl animate-pulse' /> : published}
            </p>
          </div>
          {/* Borradores */}
          <div className='bg-surface-container-lowest p-5 rounded-2xl shadow-kinetic flex flex-col gap-1 relative overflow-hidden group'>
            <div className='absolute -right-3 -top-3 w-16 h-16 bg-primary/10 rounded-full blur-2xl' />
            <p className='text-[10px] font-body font-black uppercase tracking-widest text-on-surface-variant relative z-10'>Borradores</p>
            <p className='text-4xl font-headline font-black text-on-surface relative z-10'>
              {loading ? <span className='inline-block h-9 w-9 bg-surface-container-high rounded-xl animate-pulse' /> : drafts}
            </p>
          </div>
        </div>
      </section>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        {/* Filtros */}
        <div className='flex items-center gap-1 bg-surface-container-low rounded-2xl p-1'>
          {STATUS_FILTER_LABELS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded-xl text-xs font-body font-bold transition-all ${
                filter === value
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Link href='/blog/nuevo'>
          <Button size='lg'>
            <PenLine className='h-4 w-4' />
            Nueva nota
          </Button>
        </Link>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <section className='bg-surface-container-lowest rounded-[2rem] shadow-kinetic overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow className='bg-surface-container-low/50 hover:bg-surface-container-low/50 border-none'>
              <TableHead>Nota</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acceso</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className='text-right'>Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : error ? (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={5} className='py-16 text-center'>
                  <p className='font-body font-semibold text-sm text-destructive'>{error}</p>
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={5} className='py-16 text-center'>
                  <div className='flex flex-col items-center gap-3 text-on-surface-variant'>
                    <FileText className='h-10 w-10 opacity-30' />
                    <p className='font-body font-semibold text-sm'>No hay notas</p>
                    <Link href='/blog/nuevo'>
                      <Button size='sm' variant='ghost' className='text-primary'>
                        Crear la primera nota
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((post) => {
                const status = statusBadge(post.status);
                return (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div className='flex items-center gap-4'>
                        {/* Thumbnail */}
                        {post.coverImage ? (
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className='w-16 h-10 rounded-xl object-cover shrink-0 shadow-sm'
                          />
                        ) : (
                          <div className='w-16 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center shrink-0'>
                            <BookOpen className='h-4 w-4 text-primary/40' />
                          </div>
                        )}
                        <div>
                          <p className='font-body font-bold text-on-surface line-clamp-1 max-w-xs'>
                            {post.title}
                          </p>
                          <p className='text-xs font-body font-medium text-on-surface-variant/60'>
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
                        <span className='flex items-center gap-1.5 text-xs font-body font-semibold text-on-surface-variant'>
                          <Globe className='h-3.5 w-3.5' />
                          Pública
                        </span>
                      ) : (
                        <span className='flex items-center gap-1.5 text-xs font-body font-bold text-primary'>
                          <Lock className='h-3.5 w-3.5' />
                          Suscriptores
                        </span>
                      )}
                    </TableCell>

                    <TableCell className='text-sm font-body font-medium text-on-surface-variant'>
                      {post.publishedAt
                        ? formatDate(post.publishedAt)
                        : formatDate(post.createdAt)}
                    </TableCell>

                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <Link href={`/blog/${post.id}`}>
                          <Button variant='ghost' size='icon' className='rounded-xl text-on-surface-variant hover:text-primary'>
                            <SquarePen className='h-4 w-4' />
                          </Button>
                        </Link>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='rounded-xl text-on-surface-variant hover:text-destructive'
                          onClick={() => setToDelete(post)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className='bg-surface-container-highest px-8 py-4'>
          <p className='text-sm font-body font-semibold text-on-surface-variant'>
            {loading ? '...' : `${visible.length} nota${visible.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </section>

      {/* ── Tip card ────────────────────────────────────────────────────── */}
      <div className='bg-primary p-8 rounded-[2rem] text-on-primary relative overflow-hidden group'>
        <div className='absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-700' />
        <div className='relative z-10 flex items-start gap-4'>
          <Zap className='h-6 w-6 shrink-0 mt-0.5 fill-on-primary/20' />
          <div>
            <h4 className='text-xl font-headline font-black mb-1'>Contenido para suscriptores</h4>
            <p className='text-on-primary/80 font-body text-sm leading-relaxed'>
              Las notas marcadas como <strong>"Solo suscriptores"</strong> solo se muestran completas a usuarios con membresía activa. El título y el excerpt son siempre públicos para generar interés.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
