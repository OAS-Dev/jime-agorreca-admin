import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import {
  Users,
  BarChart3,
  Bell,
  Plus,
  Lightbulb,
  Sparkles,
  CloudUpload,
  ArrowRight,
  ChevronRight,
  FileText,
  CreditCard,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  initials: string;
  name: string;
  action: string;
  date: string;
  status: 'success' | 'neutral' | 'warning' | 'error';
  statusLabel: string;
  href: string;
}

interface Metric {
  label: string;
  value: string;
  percent: number;
  colorClass: string;
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchActivity(token: string): Promise<{
  activity: ActivityItem[];
  metrics: Metric[];
}> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const headers = { Authorization: `Bearer ${token}` };

  const [subsRes, postsRes, usersRes] = await Promise.allSettled([
    fetch(`${base}/subscriptions`, { headers, cache: 'no-store' }),
    fetch(`${base}/posts?status=PUBLISHED`, { cache: 'no-store' }),
    fetch(`${base}/users`, { headers, cache: 'no-store' }),
  ]);

  // ── Subscriptions → activity items ────────────────────────────────────────
  type RawSub = {
    id: string;
    status: string;
    createdAt: string;
    user: { name: string };
  };

  const subs: RawSub[] =
    subsRes.status === 'fulfilled' && subsRes.value.ok
      ? await subsRes.value.json()
      : [];

  const subItems: ActivityItem[] = subs.slice(0, 8).map((s) => ({
    id: `sub-${s.id}`,
    initials: s.user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase(),
    name: s.user.name,
    action: 'Nueva suscripción',
    date: formatRelative(s.createdAt),
    status: s.status === 'ACTIVE' ? 'success' : s.status === 'PENDING' ? 'warning' : 'neutral',
    statusLabel: s.status === 'ACTIVE' ? 'Activa' : s.status === 'PENDING' ? 'Pendiente' : 'Inactiva',
    href: '/usuarios/suscriptores',
  }));

  // ── Posts → activity items ─────────────────────────────────────────────────
  type RawPost = {
    id: string;
    title: string;
    publishedAt: string | null;
    createdAt: string;
    author: { name: string };
  };

  const posts: RawPost[] =
    postsRes.status === 'fulfilled' && postsRes.value.ok
      ? await postsRes.value.json()
      : [];

  const postItems: ActivityItem[] = posts.slice(0, 5).map((p) => ({
    id: `post-${p.id}`,
    initials: p.author.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase(),
    name: p.author.name,
    action: `Nota publicada: "${p.title.length > 32 ? p.title.slice(0, 32) + '…' : p.title}"`,
    date: formatRelative(p.publishedAt ?? p.createdAt),
    status: 'success',
    statusLabel: 'Publicada',
    href: `/blog/${p.id}`,
  }));

  // ── Merge + sort by recency ────────────────────────────────────────────────
  const allItems = [...subItems, ...postItems]
    .sort((a, b) => {
      // Since we only have relative strings, we keep original order from server
      // (server returns desc). We interleave by re-parsing would need timestamps.
      // For simplicity: subs first (already desc), posts next.
      return 0;
    })
    .slice(0, 5);

  // ── Metrics ───────────────────────────────────────────────────────────────
  type RawUser = { id: string };

  const users: RawUser[] =
    usersRes.status === 'fulfilled' && usersRes.value.ok
      ? await usersRes.value.json()
      : [];

  const totalUsers = users.length;
  const activeCount = subs.filter((s) => s.status === 'ACTIVE').length;
  const activePercent = totalUsers > 0 ? Math.round((activeCount / totalUsers) * 100) : 0;
  const totalPercent = Math.min(100, totalUsers);

  const metrics: Metric[] = [
    {
      label: 'Suscriptores activos',
      value: activeCount.toString(),
      percent: activePercent,
      colorClass: 'bg-primary',
    },
    {
      label: 'Usuarios registrados',
      value: totalUsers.toLocaleString('es-AR'),
      percent: Math.min(totalPercent, 100),
      colorClass: 'bg-on-surface',
    },
  ];

  return { activity: allItems, metrics };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} hora${hrs !== 1 ? 's' : ''}`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Admin';
  const userInitials = session?.user?.name ? getInitials(session.user.name) : 'AD';

  const { activity, metrics } = session?.backendToken
    ? await fetchActivity(session.backendToken)
    : { activity: [], metrics: defaultMetrics() };

  return (
    <div className='p-10 xl:p-12'>

      {/* ── Top header ─────────────────────────────────────────────────── */}
      <header className='mb-14 flex justify-between items-center'>
        <div>
          <h2 className='text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-1.5'>
            ¡Hola, {firstName}!
          </h2>
          <p className='text-on-surface-variant font-body font-medium'>
            Bienvenida a tu espacio de edición y gestión.
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            className='w-11 h-11 rounded-full bg-surface-container-lowest shadow-kinetic hover:bg-surface-container-high'
          >
            <Bell className='h-5 w-5 text-on-surface-variant' />
          </Button>
          <div className='w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-kinetic-primary'>
            <span className='text-on-primary font-headline font-black text-sm'>
              {userInitials}
            </span>
          </div>
        </div>
      </header>

      {/* ── Bento grid ─────────────────────────────────────────────────── */}
      <div className='grid grid-cols-12 gap-8 items-start'>

        {/* ── Left / Center — 8 cols ──────────────────────────────────── */}
        <div className='col-span-12 xl:col-span-8 space-y-8'>

          {/* Action cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>

            <div className='group p-8 bg-surface-container-lowest rounded-2xl shadow-kinetic hover:shadow-lg transition-all duration-300 relative overflow-hidden'>
              <div className='relative z-10'>
                <div className='w-12 h-12 bg-primary/[0.08] text-primary rounded-xl flex items-center justify-center mb-6'>
                  <Users className='h-6 w-6' />
                </div>
                <h3 className='text-lg font-headline font-bold text-on-surface mb-2'>
                  Gestión de Usuarios
                </h3>
                <p className='text-on-surface-variant font-body text-sm mb-6 leading-relaxed'>
                  Administrá roles, permisos y accesos de tu equipo.
                </p>
                <Button size='sm' asChild>
                  <Link href='/usuarios'>
                    Acceder
                    <ArrowRight className='h-4 w-4' />
                  </Link>
                </Button>
              </div>
              <div className='absolute -right-3 -bottom-3 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity'>
                <Users className='h-32 w-32' />
              </div>
            </div>

            <div className='group p-8 bg-surface-container-lowest rounded-2xl shadow-kinetic hover:shadow-lg transition-all duration-300 relative overflow-hidden'>
              <div className='relative z-10'>
                <div className='w-12 h-12 bg-secondary-container/60 text-on-secondary-container rounded-xl flex items-center justify-center mb-6'>
                  <BarChart3 className='h-6 w-6' />
                </div>
                <h3 className='text-lg font-headline font-bold text-on-surface mb-2'>
                  Estadísticas Generales
                </h3>
                <p className='text-on-surface-variant font-body text-sm mb-6 leading-relaxed'>
                  Visualizá el rendimiento de tus publicaciones y audiencia.
                </p>
                <Button size='sm' variant='outline'>
                  Ver Reportes
                  <BarChart3 className='h-4 w-4' />
                </Button>
              </div>
              <div className='absolute -right-3 -bottom-3 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity'>
                <BarChart3 className='h-32 w-32' />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <section className='bg-surface-container-lowest rounded-2xl shadow-kinetic overflow-hidden'>
            <div className='px-8 py-6 flex justify-between items-center'>
              <h3 className='text-lg font-headline font-bold text-on-surface'>
                Actividad Reciente
              </h3>
              <Button variant='ghost' size='sm' className='text-primary hover:text-primary/80 hover:bg-transparent font-body font-bold' asChild>
                <Link href='/usuarios/suscriptores'>
                  Ver todo
                  <ChevronRight className='h-4 w-4' />
                </Link>
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className='bg-surface-container-low hover:bg-surface-container-low border-none'>
                  {['Usuario', 'Acción', 'Fecha', 'Estado'].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.length === 0 ? (
                  <TableRow className='hover:bg-transparent'>
                    <TableCell colSpan={4} className='py-12 text-center'>
                      <p className='font-body font-semibold text-sm text-on-surface-variant'>
                        Sin actividad reciente
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  activity.map((row) => (
                    <TableRow key={row.id} className='hover:bg-surface-container/50'>
                      <TableCell>
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 rounded-full bg-primary/[0.08] flex items-center justify-center text-primary font-headline font-bold text-xs shrink-0'>
                            {row.initials}
                          </div>
                          <span className='font-body font-bold text-sm text-on-surface'>
                            {row.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className='text-sm font-body text-on-surface-variant max-w-[200px]'>
                        <div className='flex items-center gap-2'>
                          {row.action.startsWith('Nota') ? (
                            <FileText className='h-3.5 w-3.5 shrink-0 text-on-surface-variant/50' />
                          ) : (
                            <CreditCard className='h-3.5 w-3.5 shrink-0 text-on-surface-variant/50' />
                          )}
                          <span className='truncate'>{row.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className='text-sm font-body text-on-surface-variant whitespace-nowrap'>
                        {row.date}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status}>{row.statusLabel}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>
        </div>

        {/* ── Right — 4 cols ──────────────────────────────────────────── */}
        <div className='col-span-12 xl:col-span-4 space-y-8'>

          {/* Tip Editorial */}
          <div className='bg-secondary-container p-8 rounded-2xl relative overflow-hidden group shadow-xl shadow-secondary-container/40'>
            <div className='relative z-10'>
              <div className='flex items-center gap-2 mb-4'>
                <Lightbulb className='h-5 w-5 text-on-secondary-container fill-on-secondary-container' />
                <span className='text-[10px] font-body font-black uppercase tracking-widest text-on-secondary-container'>
                  Tip Editorial
                </span>
              </div>
              <h4 className='text-xl font-headline font-extrabold text-on-secondary-container mb-3 leading-tight'>
                Publicá contenido exclusivo
              </h4>
              <p className='text-on-secondary-container/70 font-body text-sm leading-relaxed mb-6'>
                Las notas para suscriptores generan más valor percibido en tu membresía. Intentá publicar al menos una nota exclusiva por semana.
              </p>
              <Link href='/blog/nuevo'>
                <button className='text-on-secondary-container font-body font-black text-xs uppercase underline underline-offset-4 decoration-2 hover:decoration-4 transition-all'>
                  Crear nota
                </button>
              </Link>
            </div>
            <div className='absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-500'>
              <Sparkles className='h-20 w-20 text-on-secondary-container' />
            </div>
          </div>

          {/* Estado Global — real metrics */}
          <div className='bg-surface-container-lowest p-8 rounded-2xl shadow-kinetic'>
            <h4 className='text-[10px] font-body font-black uppercase tracking-widest text-on-surface-variant mb-8'>
              Estado Global
            </h4>
            <div className='space-y-7'>
              {metrics.map((m) => (
                <div key={m.label}>
                  <div className='flex justify-between items-end mb-2'>
                    <span className='text-sm font-body font-medium text-on-surface-variant'>
                      {m.label}
                    </span>
                    <span className='text-2xl font-headline font-extrabold text-on-surface'>
                      {m.value}
                    </span>
                  </div>
                  <div className='h-2 bg-surface-container-high rounded-full overflow-hidden'>
                    <div
                      className={`h-full rounded-full ${m.colorClass} transition-all duration-700`}
                      style={{ width: `${m.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload Zone */}
          <div className='border-2 border-dashed border-outline-variant bg-surface-container-low p-8 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-secondary-container hover:border-secondary-container cursor-pointer transition-all duration-300'>
            <div className='w-14 h-14 rounded-full bg-surface-container-lowest flex items-center justify-center mb-4 shadow-kinetic group-hover:scale-110 transition-transform duration-300'>
              <CloudUpload className='h-6 w-6 text-primary' />
            </div>
            <p className='font-body font-bold text-on-surface-variant group-hover:text-on-secondary-container transition-colors'>
              Subir nuevos activos
            </p>
            <p className='text-xs font-body text-outline mt-1 group-hover:text-on-secondary-container/60 transition-colors'>
              Arrastrá tus archivos aquí
            </p>
          </div>
        </div>
      </div>

      {/* ── FAB ────────────────────────────────────────────────────────── */}
      <Link href='/blog/nuevo'>
        <Button
          size='icon'
          className='fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-kinetic-primary hover:scale-110 active:scale-90 z-50'
        >
          <Plus className='h-6 w-6 stroke-[2.5]' />
        </Button>
      </Link>
    </div>
  );
}

// ── Fallback ──────────────────────────────────────────────────────────────────

function defaultMetrics(): Metric[] {
  return [
    { label: 'Suscriptores activos', value: '—', percent: 0, colorClass: 'bg-primary' },
    { label: 'Usuarios registrados', value: '—', percent: 0, colorClass: 'bg-on-surface' },
  ];
}
