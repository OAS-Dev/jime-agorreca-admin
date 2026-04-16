'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldCheck, UserPlus, SquarePen, Zap, Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: 'USER' | 'ADMIN';
  provider: 'credentials' | 'google';
  createdAt: string;
}

interface CreateAdminForm {
  name: string;
  email: string;
  password: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getInitials = (name: string) => {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonRow = () => {
  return (
    <TableRow className='animate-pulse hover:bg-transparent'>
      <TableCell>
        <div className='flex items-center gap-4'>
          <div className='w-12 h-12 rounded-2xl bg-surface-container-high shrink-0' />
          <div className='space-y-2'>
            <div className='h-3.5 w-32 bg-surface-container-high rounded-full' />
            <div className='h-2.5 w-20 bg-surface-container-high rounded-full' />
          </div>
        </div>
      </TableCell>
      <TableCell><div className='h-3 w-44 bg-surface-container-high rounded-full' /></TableCell>
      <TableCell><div className='h-3 w-24 bg-surface-container-high rounded-full' /></TableCell>
      <TableCell />
    </TableRow>
  );
}

// ── Modal de alta ─────────────────────────────────────────────────────────────

interface CreateAdminDialogProps {
  open: boolean;
  token: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newAdmin: AdminUser) => void;
}

const CreateAdminDialog = ({ open, token, onOpenChange, onSuccess }: CreateAdminDialogProps) => {
  const [form, setForm]             = useState<CreateAdminForm>({ name: '', email: '', password: '' });
  const [showPassword, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!open) {
      setForm({ name: '', email: '', password: '' });
      setShowPass(false);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // 1. Registrar el usuario (endpoint público)
      const { data: registered } = await api.post<{ user: AdminUser }>('/auth/register', {
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
      });

      // 2. Promover a ADMIN con el token del admin logueado
      const { data: promoted } = await api.patch<AdminUser>(
        `/users/${registered.user.id}/role`,
        { role: 'ADMIN' },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      onSuccess(promoted);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Ocurrió un error. Intentá de nuevo.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo administrador</DialogTitle>
          <DialogDescription>
            Creá la cuenta y asignale acceso al panel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='px-8 pb-8 space-y-5'>

          {/* Nombre */}
          <div className='space-y-2'>
            <Label htmlFor='admin-name'>Nombre completo</Label>
            <Input
              id='admin-name'
              type='text'
              autoFocus
              required
              minLength={2}
              placeholder='Ej: María García'
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Email */}
          <div className='space-y-2'>
            <Label htmlFor='admin-email'>Email</Label>
            <Input
              id='admin-email'
              type='email'
              required
              placeholder='admin@ejemplo.com'
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          {/* Contraseña */}
          <div className='space-y-2'>
            <Label htmlFor='admin-password'>Contraseña</Label>
            <div className='relative'>
              <Input
                id='admin-password'
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder='Mínimo 8 caracteres'
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className='pr-12'
              />
              <button
                type='button'
                onClick={() => setShowPass((s) => !s)}
                className='absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-on-surface-variant hover:text-on-surface active:scale-90 transition-all rounded-lg'
              >
                {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className='text-sm font-body font-semibold text-destructive bg-destructive/10 rounded-2xl px-4 py-3'>
              {error}
            </p>
          )}

          <div className='flex gap-3 pt-2'>
            <Button
              type='button'
              variant='ghost'
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className='flex-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest hover:text-on-surface'
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              disabled={submitting}
              className='flex-1'
            >
              {submitting ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <>
                  <ShieldCheck className='h-4 w-4' />
                  Crear admin
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const EquipoPage = () => {
  const { data: session } = useSession();

  const [admins, setAdmins]       = useState<AdminUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!session?.backendToken) return;

    setLoading(true);
    setError(null);

    api
      .get<AdminUser[]>('/users', {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      })
      .then(({ data }) => {
        setAdmins(data.filter((u) => u.role === 'ADMIN'));
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? 'Error al cargar el equipo');
      })
      .finally(() => setLoading(false));
  }, [session?.backendToken]);

  const handleAdminCreated = (newAdmin: AdminUser) => {
    setAdmins((prev) => [...prev, newAdmin]);
    setModalOpen(false);
  };

  return (
    <div className='p-10 xl:p-12 space-y-10'>

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
      <section className='grid grid-cols-1 md:grid-cols-3 gap-8 items-end'>
        <div className='md:col-span-2 space-y-2'>
          <h2 className='text-4xl font-headline font-extrabold tracking-tight text-on-surface'>
            Equipo Editorial
          </h2>
          <p className='text-on-surface-variant font-body font-medium'>
            Administradores con acceso completo al panel de gestión.
          </p>
        </div>

        <div className='bg-surface-container-lowest p-6 rounded-2xl shadow-kinetic flex items-center justify-between relative overflow-hidden group'>
          <div className='absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors' />
          <div className='space-y-1 relative z-10'>
            <p className='text-[10px] font-body font-black uppercase tracking-widest text-on-surface-variant'>
              Administradores
            </p>
            <h3 className='text-5xl font-headline font-black text-on-surface'>
              {loading
                ? <span className='inline-block h-12 w-12 bg-surface-container-high rounded-xl animate-pulse' />
                : admins.length
              }
            </h3>
            <p className='text-xs font-body font-semibold text-on-surface-variant'>
              miembros activos
            </p>
          </div>
          <div className='bg-primary/10 p-4 rounded-2xl relative z-10'>
            <ShieldCheck className='h-8 w-8 text-primary' />
          </div>
        </div>
      </section>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div className='flex justify-end'>
        <Button onClick={() => setModalOpen(true)} size='lg'>
          <UserPlus className='h-4 w-4' />
          Agregar Admin
        </Button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <section className='bg-surface-container-lowest rounded-[2rem] shadow-kinetic overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow className='bg-surface-container-low/50 hover:bg-surface-container-low/50 border-none'>
              <TableHead>Miembro</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Ingresó</TableHead>
              <TableHead className='text-right'>Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
            ) : error ? (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={4} className='py-16 text-center'>
                  <p className='font-body font-semibold text-sm text-destructive'>{error}</p>
                </TableCell>
              </TableRow>
            ) : admins.length === 0 ? (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={4} className='py-16 text-center'>
                  <div className='flex flex-col items-center gap-3 text-on-surface-variant'>
                    <ShieldCheck className='h-10 w-10 opacity-30' />
                    <p className='font-body font-semibold text-sm'>No hay administradores</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              admins.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className='flex items-center gap-4'>
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name}
                          className='w-12 h-12 rounded-2xl object-cover shrink-0 shadow-sm'
                        />
                      ) : (
                        <div className='w-12 h-12 rounded-2xl bg-primary/[0.08] flex items-center justify-center shrink-0 shadow-sm'>
                          <span className='font-headline font-black text-sm text-primary'>
                            {getInitials(user.name)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className='font-body font-bold text-on-surface'>{user.name}</p>
                        <Badge variant='warning'>Admin</Badge>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className='text-sm font-body font-medium text-on-surface-variant'>
                    {user.email}
                  </TableCell>

                  <TableCell className='text-sm font-body font-medium text-on-surface-variant'>
                    {formatDate(user.createdAt)}
                  </TableCell>

                  <TableCell className='text-right'>
                    <Button variant='ghost' size='icon' className='rounded-xl text-on-surface-variant'>
                      <SquarePen className='h-5 w-5' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className='bg-surface-container-highest px-8 py-4'>
          <p className='text-sm font-body font-semibold text-on-surface-variant'>
            {loading ? '...' : `${admins.length} administrador${admins.length !== 1 ? 'es' : ''}`}
          </p>
        </div>
      </section>

      {/* ── Tip card ────────────────────────────────────────────────────── */}
      <div className='bg-primary p-8 rounded-[2rem] text-on-primary relative overflow-hidden group'>
        <div className='absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-700' />
        <div className='relative z-10 flex items-start gap-4'>
          <Zap className='h-6 w-6 shrink-0 mt-0.5 fill-on-primary/20' />
          <div>
            <h4 className='text-xl font-headline font-black mb-1'>Buena práctica</h4>
            <p className='text-on-primary/80 font-body text-sm leading-relaxed'>
              Mantené el equipo de admins lo más reducido posible. Para tareas editoriales sin necesidad de acceso al panel, usá el rol <strong>Usuario</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EquipoPage;
