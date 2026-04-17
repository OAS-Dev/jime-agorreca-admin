'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSession } from 'next-auth/react'
import { ShieldCheck, UserPlus, SquarePen, Zap, Eye, EyeOff, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string
  name: string
  email: string
  image: string | null
  role: 'USER' | 'ADMIN'
  provider: 'credentials' | 'google'
  createdAt: string
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const createAdminSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

type CreateAdminFormValues = z.infer<typeof createAdminSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

const getInitials = (name: string) => {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonRow = () => {
  return (
    <TableRow className="animate-pulse hover:bg-transparent">
      <TableCell>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-surface-container-high" />
          <div className="space-y-2">
            <div className="h-3.5 w-32 rounded-full bg-surface-container-high" />
            <div className="h-2.5 w-20 rounded-full bg-surface-container-high" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="h-3 w-44 rounded-full bg-surface-container-high" />
      </TableCell>
      <TableCell>
        <div className="h-3 w-24 rounded-full bg-surface-container-high" />
      </TableCell>
      <TableCell />
    </TableRow>
  )
}

// ── Modal de alta ─────────────────────────────────────────────────────────────

interface CreateAdminDialogProps {
  open: boolean
  token: string
  onOpenChange: (open: boolean) => void
  onSuccess: (newAdmin: AdminUser) => void
}

const CreateAdminDialog = ({ open, token, onOpenChange, onSuccess }: CreateAdminDialogProps) => {
  const [showPassword, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CreateAdminFormValues>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!open) {
      form.reset()
      setShowPass(false)
      setError(null)
    }
  }, [open, form])

  const onSubmit = async (data: CreateAdminFormValues) => {
    setError(null)

    try {
      // 1. Registrar el usuario (endpoint público)
      const { data: registered } = await api.post<{ user: AdminUser }>('/auth/register', {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
      })

      // 2. Promover a ADMIN con el token del admin logueado
      const { data: promoted } = await api.patch<AdminUser>(
        `/users/${registered.user.id}/role`,
        { role: 'ADMIN' },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      onSuccess(promoted)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Ocurrió un error. Intentá de nuevo.'
      setError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo administrador</DialogTitle>
          <DialogDescription>Creá la cuenta y asignale acceso al panel.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-8 pb-8">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: María García" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contraseña */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        className="pr-12"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-on-surface-variant transition-all hover:text-on-surface active:scale-90"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error de API */}
            {error && (
              <p className="rounded-2xl bg-destructive/10 px-4 py-3 font-body text-sm font-semibold text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
                className="flex-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest hover:text-on-surface"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Crear admin
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const EquipoPage = () => {
  const { data: session } = useSession()

  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!session?.backendToken) return

    setLoading(true)
    setError(null)

    api
      .get<AdminUser[]>('/users', {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      })
      .then(({ data }) => {
        setAdmins(data.filter((u) => u.role === 'ADMIN'))
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? 'Error al cargar el equipo')
      })
      .finally(() => setLoading(false))
  }, [session?.backendToken])

  const handleAdminCreated = (newAdmin: AdminUser) => {
    setAdmins((prev) => [...prev, newAdmin])
    setModalOpen(false)
  }

  return (
    <div className="space-y-10 p-10 xl:p-12">
      {/* Dialog */}
      {session?.backendToken && (
        <CreateAdminDialog
          open={modalOpen}
          token={session.backendToken}
          onOpenChange={setModalOpen}
          onSuccess={handleAdminCreated}
        />
      )}

      {/* ── Page header + metric ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 items-end gap-8 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Equipo Editorial
          </h2>
          <p className="font-body font-medium text-on-surface-variant">
            Administradores con acceso completo al panel de gestión.
          </p>
        </div>

        <div className="group relative flex items-center justify-between overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-kinetic">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-colors group-hover:bg-primary/20" />
          <div className="relative z-10 space-y-1">
            <p className="font-body text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Administradores
            </p>
            <h3 className="font-headline text-5xl font-black text-on-surface">
              {loading ? (
                <span className="inline-block h-12 w-12 animate-pulse rounded-xl bg-surface-container-high" />
              ) : (
                admins.length
              )}
            </h3>
            <p className="font-body text-xs font-semibold text-on-surface-variant">
              miembros activos
            </p>
          </div>
          <div className="relative z-10 rounded-2xl bg-primary/10 p-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
        </div>
      </section>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)} size="lg">
          <UserPlus className="h-4 w-4" />
          Agregar Admin
        </Button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-kinetic">
        <Table>
          <TableHeader>
            <TableRow className="border-none bg-surface-container-low/50 hover:bg-surface-container-low/50">
              <TableHead>Miembro</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Ingresó</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
            ) : error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-16 text-center">
                  <p className="font-body text-sm font-semibold text-destructive">{error}</p>
                </TableCell>
              </TableRow>
            ) : admins.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                    <ShieldCheck className="h-10 w-10 opacity-30" />
                    <p className="font-body text-sm font-semibold">No hay administradores</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              admins.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name}
                          className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] shadow-sm">
                          <span className="font-headline text-sm font-black text-primary">
                            {getInitials(user.name)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-body font-bold text-on-surface">{user.name}</p>
                        <Badge variant="warning">Admin</Badge>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="font-body text-sm font-medium text-on-surface-variant">
                    {user.email}
                  </TableCell>

                  <TableCell className="font-body text-sm font-medium text-on-surface-variant">
                    {formatDate(user.createdAt)}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-on-surface-variant"
                    >
                      <SquarePen className="h-5 w-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="bg-surface-container-highest px-8 py-4">
          <p className="font-body text-sm font-semibold text-on-surface-variant">
            {loading ? '...' : `${admins.length} administrador${admins.length !== 1 ? 'es' : ''}`}
          </p>
        </div>
      </section>

      {/* ── Tip card ────────────────────────────────────────────────────── */}
      <div className="group relative overflow-hidden rounded-[2rem] bg-primary p-8 text-on-primary">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-150" />
        <div className="relative z-10 flex items-start gap-4">
          <Zap className="mt-0.5 h-6 w-6 shrink-0 fill-on-primary/20" />
          <div>
            <h4 className="mb-1 font-headline text-xl font-black">Buena práctica</h4>
            <p className="font-body text-sm leading-relaxed text-on-primary/80">
              Mantené el equipo de admins lo más reducido posible. Para tareas editoriales sin
              necesidad de acceso al panel, usá el rol <strong>Usuario</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EquipoPage
