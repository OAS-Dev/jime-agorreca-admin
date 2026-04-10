'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldCheck, UserPlus, SquarePen, Zap } from 'lucide-react';
import api from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EquipoPage() {
  const { data: session } = useSession();

  const [admins, setAdmins]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

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

  return (
    <div className='p-8 max-w-5xl mx-auto space-y-10'>

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
        <button className='flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-full font-headline font-bold shadow-kinetic-primary hover:opacity-90 active:scale-95 transition-all'>
          <UserPlus className='h-4 w-4' />
          Agregar Admin
        </button>
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
                  <p className='font-body font-semibold text-sm text-error'>{error}</p>
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
                        <span className='px-2 py-0.5 text-[10px] font-body font-black uppercase tracking-wider rounded-full bg-secondary-container text-on-secondary-container'>
                          Admin
                        </span>
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
                    <button className='p-2 hover:bg-surface-container-highest rounded-xl text-on-surface-variant active:scale-90 transition-all'>
                      <SquarePen className='h-5 w-5' />
                    </button>
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
