'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingUp,
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

const PAGE_SIZE = 10;

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
      <TableCell><div className='h-5 w-20 bg-surface-container-high rounded-full' /></TableCell>
      <TableCell><div className='h-3 w-24 bg-surface-container-high rounded-full' /></TableCell>
    </TableRow>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuscriptoresPage() {
  const { data: session } = useSession();

  const [allUsers, setAllUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);

  useEffect(() => {
    if (!session?.backendToken) return;

    setLoading(true);
    setError(null);

    api
      .get<AdminUser[]>('/users', {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      })
      .then(({ data }) => {
        setAllUsers(data.filter((u) => u.role === 'USER'));
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? 'Error al cargar suscriptores');
      })
      .finally(() => setLoading(false));
  }, [session?.backendToken]);

  // Client-side search
  const filtered = useMemo(() => {
    if (!search.trim()) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [allUsers, search]);

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const visiblePages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5)        return i + 1;
    if (page <= 3)              return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className='p-8 max-w-5xl mx-auto space-y-10'>

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <div className='relative w-full max-w-md group'>
        <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant group-focus-within:text-primary transition-colors' />
        <input
          type='text'
          placeholder='Buscar por nombre o email...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='w-full pl-10 pr-4 py-2.5 bg-surface-container-highest border-none rounded-xl text-sm font-body font-medium text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all'
        />
      </div>

      {/* ── Page header + metric ────────────────────────────────────────── */}
      <section className='grid grid-cols-1 md:grid-cols-3 gap-8 items-end'>
        <div className='md:col-span-2 space-y-2'>
          <h2 className='text-4xl font-headline font-extrabold tracking-tight text-on-surface'>
            Suscriptores
          </h2>
          <p className='text-on-surface-variant font-body font-medium'>
            Usuarios registrados en la plataforma.
          </p>
        </div>

        <div className='bg-surface-container-lowest p-6 rounded-2xl shadow-kinetic flex items-center justify-between relative overflow-hidden group'>
          <div className='absolute -right-4 -top-4 w-24 h-24 bg-secondary-container/20 rounded-full blur-2xl group-hover:bg-secondary-container/40 transition-colors' />
          <div className='space-y-1 relative z-10'>
            <p className='text-[10px] font-body font-black uppercase tracking-widest text-on-surface-variant'>
              Total
            </p>
            <h3 className='text-5xl font-headline font-black text-on-surface'>
              {loading
                ? <span className='inline-block h-12 w-20 bg-surface-container-high rounded-xl animate-pulse' />
                : allUsers.length.toLocaleString('es-AR')
              }
            </h3>
            <div className='flex items-center gap-1 text-tertiary font-body font-bold text-sm'>
              <TrendingUp className='h-4 w-4' />
              <span>Suscriptores</span>
            </div>
          </div>
          <div className='bg-primary/10 p-4 rounded-2xl relative z-10'>
            <Users className='h-8 w-8 text-primary' />
          </div>
        </div>
      </section>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <section className='bg-surface-container-lowest rounded-[2rem] shadow-kinetic overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow className='bg-surface-container-low/50 hover:bg-surface-container-low/50 border-none'>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Registrado</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : error ? (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={4} className='py-16 text-center'>
                  <p className='font-body font-semibold text-sm text-error'>{error}</p>
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={4} className='py-16 text-center'>
                  <div className='flex flex-col items-center gap-3 text-on-surface-variant'>
                    <Users className='h-10 w-10 opacity-30' />
                    <p className='font-body font-semibold text-sm'>
                      {search ? 'Sin resultados para esa búsqueda' : 'Aún no hay suscriptores'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paged.map((user) => (
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
                        <div className='w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center shrink-0'>
                          <span className='font-headline font-black text-sm text-on-surface-variant'>
                            {getInitials(user.name)}
                          </span>
                        </div>
                      )}
                      <p className='font-body font-bold text-on-surface'>{user.name}</p>
                    </div>
                  </TableCell>

                  <TableCell className='text-sm font-body font-medium text-on-surface-variant'>
                    {user.email}
                  </TableCell>

                  <TableCell>
                    <span className={`px-3 py-1 text-[10px] font-body font-black uppercase tracking-wider rounded-full ${
                      user.provider === 'google'
                        ? 'bg-surface-container-highest text-on-surface-variant'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {user.provider}
                    </span>
                  </TableCell>

                  <TableCell className='text-sm font-body font-medium text-on-surface-variant'>
                    {formatDate(user.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer */}
        <div className='bg-surface-container-highest px-8 py-4 flex items-center justify-between'>
          <p className='text-sm font-body font-semibold text-on-surface-variant'>
            Mostrando {paged.length} de {filtered.length.toLocaleString('es-AR')} suscriptores
          </p>

          {totalPages > 1 && (
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className='w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-lowest text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
              >
                <ChevronLeft className='h-4 w-4' />
              </button>

              {visiblePages.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-body font-bold transition-colors ${
                    p === page
                      ? 'bg-primary text-on-primary shadow-kinetic-primary'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className='w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-lowest text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
              >
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Bottom card ─────────────────────────────────────────────────── */}
      <div className='bg-secondary-container p-8 rounded-[2rem] text-on-secondary-container flex items-center gap-6 border-2 border-dashed border-primary/20 pb-10'>
        <div>
          <h4 className='text-xl font-headline font-black mb-2'>Exportar base</h4>
          <p className='text-sm font-body font-medium leading-relaxed mb-4'>
            Descargá el listado completo de suscriptores para auditoría o análisis externo.
          </p>
          <button className='bg-on-secondary-container text-white px-6 py-2 rounded-full text-xs font-body font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all flex items-center gap-2'>
            <Download className='h-3.5 w-3.5' />
            Descargar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
