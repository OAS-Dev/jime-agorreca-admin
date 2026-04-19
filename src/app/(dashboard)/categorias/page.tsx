'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSession } from 'next-auth/react'
import { FolderOpen, Plus, Pencil, Trash2, Film, Loader2, GripVertical } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

interface Category {
  id: string
  name: string
  description: string | null
  coverImage: string | null
  order: number
  _count: { videos: number }
  createdAt: string
}

// ── Schema ────────────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  coverImage: z.string().url('URL inválida').optional().or(z.literal('')),
  order: z.number().int().min(0),
})

type CategoryFormValues = z.infer<typeof categorySchema>

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <TableRow className="animate-pulse hover:bg-transparent">
    <TableCell><div className="h-4 w-40 rounded-full bg-surface-container-high" /></TableCell>
    <TableCell><div className="h-4 w-56 rounded-full bg-surface-container-high" /></TableCell>
    <TableCell><div className="h-5 w-12 rounded-full bg-surface-container-high" /></TableCell>
    <TableCell><div className="h-4 w-10 rounded-full bg-surface-container-high" /></TableCell>
    <TableCell><div className="flex gap-2"><div className="h-8 w-8 rounded-lg bg-surface-container-high" /><div className="h-8 w-8 rounded-lg bg-surface-container-high" /></div></TableCell>
  </TableRow>
)

// ── Category Form Dialog ──────────────────────────────────────────────────────

const CategoryFormDialog = ({
  open,
  onOpenChange,
  initial,
  onSaved,
  backendToken,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: Category | null
  onSaved: (cat: Category) => void
  backendToken: string
}) => {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = !!initial

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '', coverImage: '', order: 0 },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        initial
          ? {
              name: initial.name,
              description: initial.description ?? '',
              coverImage: initial.coverImage ?? '',
              order: initial.order,
            }
          : { name: '', description: '', coverImage: '', order: 0 },
      )
      setError(null)
    }
  }, [open, initial, form])

  const onSubmit = async (data: CategoryFormValues) => {
    setSaving(true)
    setError(null)
    const payload = {
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      coverImage: data.coverImage?.trim() || undefined,
      order: data.order,
    }
    try {
      if (isEdit && initial) {
        const { data: res } = await api.patch<{ category: Category }>(
          `/categories/${initial.id}`,
          payload,
          { headers: { Authorization: `Bearer ${backendToken}` } },
        )
        onSaved(res.category)
      } else {
        const { data: res } = await api.post<{ category: Category }>(
          '/categories',
          payload,
          { headers: { Authorization: `Bearer ${backendToken}` } },
        )
        onSaved(res.category)
      }
      onOpenChange(false)
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
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          {!isEdit && (
            <DialogDescription>
              Las categorías agrupan videos en la videoteca del dashboard.
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-8 pb-8 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Administrador de Meta" disabled={saving} {...field} />
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
                  <FormLabel>Descripción <span className="font-normal text-on-surface-variant">(opcional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Breve descripción..." disabled={saving} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de imagen de portada <span className="font-normal text-on-surface-variant">(opcional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." disabled={saving} {...field} />
                  </FormControl>
                  <FormMessage />
                  {field.value && (
                    <img
                      src={field.value}
                      alt="preview"
                      className="mt-2 h-20 w-full rounded-xl object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orden <span className="font-normal text-on-surface-variant">(menor = primero)</span></FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      disabled={saving}
                      className="w-28"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <p className="font-body text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? 'Guardando...' : 'Creando...'}</>
                ) : (
                  isEdit ? 'Guardar cambios' : 'Crear categoría'
                )}
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
  category,
  onClose,
  onDeleted,
  backendToken,
}: {
  category: Category | null
  onClose: () => void
  onDeleted: (id: string) => void
  backendToken: string
}) => {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!category) return
    setDeleting(true)
    setError(null)
    try {
      await api.delete(`/categories/${category.id}`, {
        headers: { Authorization: `Bearer ${backendToken}` },
      })
      onDeleted(category.id)
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
    <Dialog open={!!category} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Eliminar categoría?</DialogTitle>
          <DialogDescription>
            Se eliminará <strong>{category?.name}</strong>. Los videos asignados a esta categoría
            quedarán sin categoría. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="px-8 font-body text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const CategoriasPage = () => {
  const { data: session } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [toEdit, setToEdit] = useState<Category | null>(null)
  const [toDelete, setToDelete] = useState<Category | null>(null)

  useEffect(() => {
    if (!session?.backendToken) return
    setLoading(true)
    api
      .get<{ categories: Category[] }>('/categories', {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      })
      .then(({ data }) => setCategories(data.categories))
      .catch((err) =>
        setError(err?.response?.data?.message ?? err?.message ?? 'Error al cargar categorías'),
      )
      .finally(() => setLoading(false))
  }, [session?.backendToken])

  const handleOpenCreate = () => {
    setToEdit(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (cat: Category) => {
    setToEdit(cat)
    setFormOpen(true)
  }

  const handleSaved = (cat: Category) => {
    setCategories((prev) => {
      const exists = prev.find((c) => c.id === cat.id)
      if (exists) return prev.map((c) => (c.id === cat.id ? cat : c))
      return [...prev, cat].sort((a, b) => a.order - b.order)
    })
  }

  const totalVideos = categories.reduce((acc, c) => acc + c._count.videos, 0)

  return (
    <div className="space-y-10 p-4 sm:p-6 lg:p-10 xl:p-12">
      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={toEdit}
        onSaved={handleSaved}
        backendToken={session?.backendToken ?? ''}
      />
      <DeleteDialog
        category={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={(id) => setCategories((prev) => prev.filter((c) => c.id !== id))}
        backendToken={session?.backendToken ?? ''}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Categorías
          </h2>
          <p className="font-body font-medium text-on-surface-variant">
            Agrupá los videos de la videoteca por temáticas o módulos.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: 'Categorías', value: categories.length, icon: FolderOpen },
          { label: 'Videos asignados', value: totalVideos, icon: Film },
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
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Videos</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-16 text-center">
                    <p className="font-body text-sm font-semibold text-destructive">{error}</p>
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                      <FolderOpen className="h-10 w-10 opacity-30" />
                      <p className="font-body text-sm font-semibold">No hay categorías aún</p>
                      <Button size="sm" onClick={handleOpenCreate}>
                        Crear la primera categoría
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    {/* Name + cover */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {cat.coverImage ? (
                          <img
                            src={cat.coverImage}
                            alt={cat.name}
                            className="h-10 w-16 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08]">
                            <FolderOpen className="h-4 w-4 text-primary/40" />
                          </div>
                        )}
                        <p className="font-body font-bold text-on-surface">{cat.name}</p>
                      </div>
                    </TableCell>

                    {/* Description */}
                    <TableCell>
                      <p className="max-w-xs truncate font-body text-sm text-on-surface-variant">
                        {cat.description ?? <span className="italic opacity-40">Sin descripción</span>}
                      </p>
                    </TableCell>

                    {/* Video count */}
                    <TableCell>
                      <Badge variant={cat._count.videos > 0 ? 'success' : 'warning'}>
                        {cat._count.videos} {cat._count.videos === 1 ? 'video' : 'videos'}
                      </Badge>
                    </TableCell>

                    {/* Order */}
                    <TableCell>
                      <span className="flex items-center gap-1.5 font-body text-sm text-on-surface-variant">
                        <GripVertical className="h-3.5 w-3.5 opacity-40" />
                        {cat.order}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-primary/[0.08] hover:text-primary"
                          onClick={() => handleOpenEdit(cat)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-destructive/[0.08] hover:text-destructive"
                          onClick={() => setToDelete(cat)}
                          title="Eliminar"
                          disabled={cat._count.videos > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

export default CategoriasPage
