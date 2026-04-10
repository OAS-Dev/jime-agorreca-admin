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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ── Static mock data ──────────────────────────────────────────────────────────

const recentActivity = [
  {
    id: 1,
    initials: 'MA',
    name: 'Marcos Andreu',
    action: 'Cambio de contraseña',
    date: 'Hace 2 horas',
    status: 'success' as const,
    statusLabel: 'Completado',
  },
  {
    id: 2,
    initials: 'SL',
    name: 'Sofía Luna',
    action: 'Nueva suscripción',
    date: 'Hace 5 horas',
    status: 'success' as const,
    statusLabel: 'Activo',
  },
  {
    id: 3,
    initials: 'JP',
    name: 'Juan Pérez',
    action: 'Error de inicio de sesión',
    date: 'Ayer, 18:45',
    status: 'error' as const,
    statusLabel: 'Fallido',
  },
];

const metrics = [
  { label: 'Usuarios Activos', value: '1.284', percent: 75, colorClass: 'bg-primary' },
  { label: 'Capacidad del Servidor', value: '42%', percent: 42, colorClass: 'bg-on-surface' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Admin';
  const userInitials = session?.user?.name ? getInitials(session.user.name) : 'AD';

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
          {/* Notification bell */}
          <button className='w-11 h-11 flex items-center justify-center rounded-full bg-surface-container-lowest shadow-kinetic hover:bg-surface-container-high transition-colors'>
            <Bell className='h-5 w-5 text-on-surface-variant' />
          </button>

          {/* User avatar */}
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

            {/* Gestión de Usuarios */}
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
              {/* Decorative ghost icon */}
              <div className='absolute -right-3 -bottom-3 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity'>
                <Users className='h-32 w-32' />
              </div>
            </div>

            {/* Estadísticas Generales */}
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
              <button className='text-primary text-sm font-body font-bold hover:text-primary/80 transition-colors flex items-center gap-1'>
                Ver todo
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full text-left'>
                <thead className='bg-surface-container-low'>
                  <tr>
                    {['Usuario', 'Acción', 'Fecha', 'Estado'].map((h) => (
                      <th
                        key={h}
                        className='px-8 py-4 text-[10px] font-body font-bold text-on-surface-variant uppercase tracking-wider'
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((row) => (
                    <tr
                      key={row.id}
                      className='hover:bg-surface-container/50 transition-colors'
                    >
                      <td className='px-8 py-5'>
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 rounded-full bg-primary/[0.08] flex items-center justify-center text-primary font-headline font-bold text-xs shrink-0'>
                            {row.initials}
                          </div>
                          <span className='font-body font-bold text-sm text-on-surface'>
                            {row.name}
                          </span>
                        </div>
                      </td>
                      <td className='px-8 py-5 text-sm font-body text-on-surface-variant'>
                        {row.action}
                      </td>
                      <td className='px-8 py-5 text-sm font-body text-on-surface-variant'>
                        {row.date}
                      </td>
                      <td className='px-8 py-5'>
                        <Badge variant={row.status}>{row.statusLabel}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* ── Right — 4 cols ──────────────────────────────────────────── */}
        <div className='col-span-12 xl:col-span-4 space-y-8'>

          {/* Tip Editorial — yellow card */}
          <div className='bg-secondary-container p-8 rounded-2xl relative overflow-hidden group shadow-xl shadow-secondary-container/40'>
            <div className='relative z-10'>
              <div className='flex items-center gap-2 mb-4'>
                <Lightbulb className='h-5 w-5 text-on-secondary-container fill-on-secondary-container' />
                <span className='text-[10px] font-body font-black uppercase tracking-widest text-on-secondary-container'>
                  Tip Editorial
                </span>
              </div>
              <h4 className='text-xl font-headline font-extrabold text-on-secondary-container mb-3 leading-tight'>
                Optimizá tu lista de usuarios
              </h4>
              <p className='text-on-secondary-container/70 font-body text-sm leading-relaxed mb-6'>
                Revisar los roles mensualmente ayuda a mantener la seguridad de tu plataforma. Asegurate de que solo los editores activos tengan acceso total.
              </p>
              <button className='text-on-secondary-container font-body font-black text-xs uppercase underline underline-offset-4 decoration-2 hover:decoration-4 transition-all'>
                Leer más consejos
              </button>
            </div>
            {/* Decorative */}
            <div className='absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-500'>
              <Sparkles className='h-20 w-20 text-on-secondary-container' />
            </div>
          </div>

          {/* Estado Global — metrics */}
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
      <button className='fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-kinetic-primary flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-200 z-50'>
        <Plus className='h-6 w-6 stroke-[2.5]' />
      </button>
    </div>
  );
}
