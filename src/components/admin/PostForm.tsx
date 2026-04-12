'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Globe, Lock, Loader2, Link2, Tag, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// ── Types ─────────────────────────────────────────────────────────────────────

type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type PostAccess = 'PUBLIC' | 'SUBSCRIBERS_ONLY';

export interface PostFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  status: PostStatus;
  access: PostAccess;
  tags: string[];
}

interface PostFormProps {
  mode: 'create' | 'edit';
  postId?: string;
  initialData?: Partial<PostFormData>;
}

// ── Slug generation ───────────────────────────────────────────────────────────

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

// ── Tags input ────────────────────────────────────────────────────────────────

function TagsInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  const addTag = (value: string) => {
    const cleaned = value.trim().toLowerCase();
    if (cleaned && !tags.includes(cleaned)) onChange([...tags, cleaned]);
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className='flex flex-wrap gap-2 bg-surface-container-low rounded-2xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 transition-all min-h-[44px]'>
      {tags.map((tag) => (
        <span
          key={tag}
          className='inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-body font-bold px-2.5 py-1 rounded-full'
        >
          {tag}
          <button
            type='button'
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className='hover:text-primary/60 transition-colors leading-none'
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? 'Escribí un tag y presioná Enter' : ''}
        className='flex-1 min-w-[120px] bg-transparent text-sm font-body font-medium text-on-surface placeholder:text-on-surface-variant/50 outline-none'
      />
    </div>
  );
}

// ── PostForm ──────────────────────────────────────────────────────────────────

export default function PostForm({ mode, postId, initialData }: PostFormProps) {
  const { data: session } = useSession();
  const router = useRouter();

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
  });
  const [slugManual, setSlugManual] = useState(!!initialData?.slug);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Focus title on mount
  useEffect(() => { titleRef.current?.focus(); }, []);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((f) => ({ ...f, slug: slugify(form.title) }));
    }
  }, [form.title, slugManual]);

  const set = <K extends keyof PostFormData>(key: K, value: PostFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent, publishNow?: boolean) => {
    e.preventDefault();
    if (!session?.backendToken) return;
    setError(null);
    setSubmitting(true);

    const payload = {
      ...form,
      excerpt: form.excerpt || undefined,
      coverImage: form.coverImage || undefined,
      status: publishNow ? ('PUBLISHED' as PostStatus) : form.status,
    };

    try {
      if (mode === 'create') {
        await api.post('/posts', payload, {
          headers: { Authorization: `Bearer ${session.backendToken}` },
        });
      } else {
        await api.patch(`/posts/${postId}`, payload, {
          headers: { Authorization: `Bearer ${session.backendToken}` },
        });
      }
      router.push('/blog');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Ocurrió un error. Intentá de nuevo.',
      );
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className='min-h-screen bg-background'>

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div className='sticky top-0 z-40 bg-surface-container-lowest/80 backdrop-blur-md border-b border-surface-container-high/50 px-8 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link href='/blog'>
              <Button type='button' variant='ghost' size='icon' className='rounded-xl text-on-surface-variant'>
                <ArrowLeft className='h-5 w-5' />
              </Button>
            </Link>
            <div>
              <p className='text-xs font-body font-black uppercase tracking-widest text-on-surface-variant'>
                {mode === 'create' ? 'Nueva nota' : 'Editando nota'}
              </p>
              {form.status === 'DRAFT' && (
                <p className='text-[10px] font-body font-semibold text-on-surface-variant/50'>Borrador sin guardar</p>
              )}
              {form.status === 'PUBLISHED' && (
                <p className='text-[10px] font-body font-semibold text-green-600'>Publicada</p>
              )}
            </div>
          </div>

          <div className='flex items-center gap-3'>
            {error && (
              <p className='text-xs font-body font-semibold text-destructive'>{error}</p>
            )}
            {/* Guardar borrador */}
            <Button
              type='button'
              variant='ghost'
              disabled={submitting || !form.title || !form.content}
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, false)}
              className='bg-surface-container-high text-on-surface hover:bg-surface-container-highest hover:text-on-surface'
            >
              {submitting ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Guardar borrador'}
            </Button>
            {/* Publicar */}
            {form.status !== 'PUBLISHED' && (
              <Button
                type='button'
                disabled={submitting || !form.title || !form.content}
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
              >
                {submitting ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Publicar'}
              </Button>
            )}
            {/* Guardar cambios (modo edit publicada) */}
            {form.status === 'PUBLISHED' && mode === 'edit' && (
              <Button
                type='button'
                disabled={submitting || !form.title || !form.content}
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent, false)}
              >
                {submitting ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Guardar cambios'}
              </Button>
            )}
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className='max-w-6xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8'>

          {/* Left: content */}
          <div className='lg:col-span-2 space-y-6'>

            {/* Title */}
            <input
              ref={titleRef}
              type='text'
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder='Título de la nota...'
              required
              className='w-full bg-transparent text-4xl font-headline font-black text-on-surface placeholder:text-on-surface-variant/30 outline-none resize-none leading-tight'
            />

            {/* Slug */}
            <div className='flex items-center gap-2 group'>
              <Link2 className='h-3.5 w-3.5 text-on-surface-variant/40 shrink-0' />
              <input
                type='text'
                value={form.slug}
                onChange={(e) => { setSlugManual(true); set('slug', e.target.value); }}
                placeholder='slug-de-la-nota'
                className='flex-1 bg-transparent text-sm font-body font-medium text-on-surface-variant placeholder:text-on-surface-variant/30 outline-none'
              />
              {slugManual && (
                <button
                  type='button'
                  onClick={() => { setSlugManual(false); set('slug', slugify(form.title)); }}
                  className='text-[10px] font-body font-bold text-primary hover:text-primary/70 transition-colors'
                >
                  Auto
                </button>
              )}
            </div>

            {/* Divider */}
            <div className='h-px bg-surface-container-high' />

            {/* Excerpt */}
            <div className='space-y-2'>
              <Label className='text-xs font-body font-black uppercase tracking-widest text-on-surface-variant/60'>
                Resumen (excerpt)
              </Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => set('excerpt', e.target.value)}
                placeholder='Breve descripción que aparece en el listado del blog...'
                className='min-h-[80px] text-base leading-relaxed'
              />
            </div>

            {/* Content */}
            <div className='space-y-2'>
              <Label className='text-xs font-body font-black uppercase tracking-widest text-on-surface-variant/60'>
                Contenido (Markdown)
              </Label>
              <Textarea
                value={form.content}
                onChange={(e) => set('content', e.target.value)}
                placeholder='# Título&#10;&#10;Escribí el contenido de la nota en Markdown...'
                required
                className='min-h-[480px] font-mono text-sm leading-relaxed'
              />
            </div>
          </div>

          {/* Right: sidebar metadata */}
          <div className='space-y-5'>

            {/* Estado */}
            <div className='bg-surface-container-lowest rounded-[1.5rem] shadow-kinetic p-6 space-y-4'>
              <h3 className='text-xs font-body font-black uppercase tracking-widest text-on-surface-variant'>
                Estado
              </h3>
              <Select
                value={form.status}
                onValueChange={(v) => set('status', v as PostStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='DRAFT'>Borrador</SelectItem>
                  <SelectItem value='PUBLISHED'>Publicada</SelectItem>
                  <SelectItem value='ARCHIVED'>Archivada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Acceso */}
            <div className='bg-surface-container-lowest rounded-[1.5rem] shadow-kinetic p-6 space-y-4'>
              <h3 className='text-xs font-body font-black uppercase tracking-widest text-on-surface-variant'>
                Acceso
              </h3>
              <div className='flex items-start gap-4'>
                <Switch
                  checked={form.access === 'SUBSCRIBERS_ONLY'}
                  onCheckedChange={(checked) =>
                    set('access', checked ? 'SUBSCRIBERS_ONLY' : 'PUBLIC')
                  }
                />
                <div>
                  {form.access === 'PUBLIC' ? (
                    <>
                      <div className='flex items-center gap-1.5 mb-0.5'>
                        <Globe className='h-3.5 w-3.5 text-on-surface-variant' />
                        <span className='text-sm font-body font-bold text-on-surface'>Pública</span>
                      </div>
                      <p className='text-xs font-body text-on-surface-variant/70 leading-snug'>
                        Visible para todos los visitantes.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className='flex items-center gap-1.5 mb-0.5'>
                        <Lock className='h-3.5 w-3.5 text-primary' />
                        <span className='text-sm font-body font-bold text-primary'>Solo suscriptores</span>
                      </div>
                      <p className='text-xs font-body text-on-surface-variant/70 leading-snug'>
                        El contenido completo solo es accesible con membresía activa.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Cover image */}
            <div className='bg-surface-container-lowest rounded-[1.5rem] shadow-kinetic p-6 space-y-4'>
              <h3 className='text-xs font-body font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2'>
                <ImageIcon className='h-3.5 w-3.5' />
                Imagen de portada
              </h3>
              <Input
                type='url'
                value={form.coverImage}
                onChange={(e) => set('coverImage', e.target.value)}
                placeholder='https://...'
              />
              {form.coverImage && (
                <div className='rounded-xl overflow-hidden aspect-video'>
                  <img
                    src={form.coverImage}
                    alt='Cover preview'
                    className='w-full h-full object-cover'
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            {/* Tags */}
            <div className='bg-surface-container-lowest rounded-[1.5rem] shadow-kinetic p-6 space-y-4'>
              <h3 className='text-xs font-body font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2'>
                <Tag className='h-3.5 w-3.5' />
                Tags
              </h3>
              <TagsInput
                tags={form.tags}
                onChange={(tags) => set('tags', tags)}
              />
              <p className='text-[10px] font-body text-on-surface-variant/50'>
                Presioná Enter o coma para agregar
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
