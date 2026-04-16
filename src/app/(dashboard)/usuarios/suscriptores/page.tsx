'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  XCircle,
  CreditCard,
  Zap,
  Mail,
  Hash,
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

type SubscriptionStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
type Gateway = 'MERCADOPAGO' | 'PAYPAL';
type BillingPeriod = 'MONTHLY' | 'ANNUAL';

interface Subscription {
  id: string;
  status: SubscriptionStatus;
  startDate: string | null;
  endDate: string | null;
  cancelledAt: string | null;
  createdAt: string;
  plan: {
    name: string;
    priceArs: string;
    priceUsd: string;
    billingPeriod: BillingPeriod;
  };
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    isActivated: boolean;
  };
  payments: {
    id: string;
    gateway: Gateway;
    status: PaymentStatus;
    amount: string;
    currency: string;
    gatewayPaymentId: string | null;
    payerEmail: string | null;
    payerName: string | null;
    createdAt: string;
  }[];
}

type FilterTab = 'ALL' | SubscriptionStatus;

// ── Helpers ───────────────────────────────────────────────────────────────────

const getInitials = (name: string) => {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const isExpiringSoon = (endDate: string | null): boolean => {
  if (!endDate) return false;
  const days = (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days > 0 && days <= 7;
}

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; variant: 'success' | 'neutral' | 'error' | 'warning' }> = {
  ACTIVE:    { label: 'Activa',    variant: 'success'  },
  PENDING:   { label: 'Pendiente', variant: 'warning'  },
  EXPIRED:   { label: 'Vencida',   variant: 'error'    },
  CANCELLED: { label: 'Cancelada', variant: 'neutral'  },
};

const GATEWAY_LABEL: Record<Gateway, string> = {
  MERCADOPAGO: 'Mercado Pago',
  PAYPAL:      'PayPal',
};

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'ALL',       label: 'Todas'      },
  { value: 'ACTIVE',    label: 'Activas'    },
  { value: 'PENDING',   label: 'Pendientes' },
  { value: 'EXPIRED',   label: 'Vencidas'   },
  { value: 'CANCELLED', label: 'Canceladas' },
];

const PAGE_SIZE = 10;

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonRow = () => {
  return (
    <TableRow className='animate-pulse hover:bg-transparent'>
      <TableCell>
        <div className='flex items-center gap-4'>
          <div className='w-12 h-12 rounded-2xl bg-surface-container-high shrink-0' />
          <div className='space-y-2'>
            <div className='h-3.5 w-32 bg-surface-container-high rounded-full' />
            <div className='h-2.5 w-40 bg-surface-container-high rounded-full' />
          </div>
        </div>
      </TableCell>
      <TableCell><div className='h-5 w-20 bg-surface-container-high rounded-full' /></TableCell>
      <TableCell><div className='h-3.5 w-28 bg-surface-container-high rounded-full' /></TableCell>
      <TableCell><div className='h-3.5 w-24 bg-surface-container-high rounded-full' /></TableCell>
      <TableCell><div className='h-3.5 w-20 bg-surface-container-high rounded-full' /></TableCell>
      <TableCell><div className='h-3.5 w-20 bg-surface-container-high rounded-full' /></TableCell>
    </TableRow>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

const MetricCard = ({
  label,
  value,
  icon: Icon,
  loading,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  loading: boolean;
  accent?: string;
}) => {
  return (
    <div className='bg-surface-container-lowest p-6 rounded-2xl shadow-kinetic flex items-center justify-between relative overflow-hidden group'>
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl transition-all ${accent ?? 'bg-primary/10 group-hover:bg-primary/20'}`} />
      <div className='space-y-1 relative z-10'>
        <p className='text-[10px] font-body font-black uppercase tracking-widest text-on-surface-variant'>
          {label}
        </p>
        <h3 className='text-4xl font-headline font-black text-on-surface'>
          {loading
            ? <span className='inline-block h-10 w-14 bg-surface-container-high rounded-xl animate-pulse' />
            : value
          }
        </h3>
      </div>
      <div className='bg-primary/10 p-4 rounded-2xl relative z-10'>
        <Icon className='h-7 w-7 text-primary' />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const SuscriptoresPage = () => {
  const { data: session } = useSession();

  const [subs, setSubs]             = useState<Subscription[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<FilterTab>('ALL');
  const [page, setPage]             = useState(1);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resentId, setResentId]     = useState<string | null>(null);

  const handleResendActivation = async (email: string, subId: string) => {
    setResendingId(subId);
    setResentId(null);
    try {
      await api.post(
        '/auth/resend-activation',
        { email },
        { headers: { Authorization: `Bearer ${session?.backendToken}` } },
      );
      setResentId(subId);
      setTimeout(() => setResentId(null), 3000);
    } catch {
      // silencioso — el endpoint siempre responde 200
    } finally {
      setResendingId(null);
    }
  };

  useEffect(() => {
    if (!session?.backendToken) return;
    setLoading(true);
    setError(null);

    api
      .get<Subscription[]>('/subscriptions', {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      })
      .then(({ data }) => setSubs(data))
      .catch((err) => setError(err?.response?.data?.message ?? err?.message ?? 'Error al cargar suscripciones'))
      .finally(() => setLoading(false));
  }, [session?.backendToken]);

  // Reset page on filter/search change
  useEffect(() => { setPage(1); }, [search, filter]);

  const filtered = useMemo(() => {
    let result = subs;

    if (filter !== 'ALL') result = result.filter((s) => s.status === filter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.user.name.toLowerCase().includes(q) ||
          s.user.email.toLowerCase().includes(q),
      );
    }

    return result;
  }, [subs, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const visiblePages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5)        return i + 1;
    if (page <= 3)              return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  // Metrics
  const activeCount    = subs.filter((s) => s.status === 'ACTIVE').length;
  const pendingCount   = subs.filter((s) => s.status === 'PENDING').length;
  const expiredCount   = subs.filter((s) => s.status === 'EXPIRED' || s.status === 'CANCELLED').length;

  return (
    <div className='p-10 xl:p-12 space-y-10'>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className='space-y-1'>
        <h2 className='text-4xl font-headline font-extrabold tracking-tight text-on-surface'>
          Suscriptores
        </h2>
        <p className='text-on-surface-variant font-body font-medium'>
          Estado de todas las membresías en la plataforma.
        </p>
      </div>

      {/* ── Metrics ─────────────────────────────────────────────────────── */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <MetricCard label='Total'     value={subs.length}    icon={Users}      loading={loading} />
        <MetricCard label='Activas'   value={activeCount}    icon={TrendingUp} loading={loading} accent='bg-green-500/10 group-hover:bg-green-500/20' />
        <MetricCard label='Pendientes' value={pendingCount}  icon={Clock}      loading={loading} accent='bg-secondary-container/30 group-hover:bg-secondary-container/50' />
        <MetricCard label='Inactivas' value={expiredCount}   icon={XCircle}    loading={loading} accent='bg-destructive/10 group-hover:bg-destructive/20' />
      </div>

      {/* ── Filters + Search ────────────────────────────────────────────── */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>

        {/* Filter tabs */}
        <div className='flex items-center gap-1 bg-surface-container-low rounded-2xl p-1 flex-wrap'>
          {FILTER_TABS.map(({ value, label }) => (
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

        {/* Search */}
        <div className='relative w-full sm:w-72 group shrink-0'>
          <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant group-focus-within:text-primary transition-colors pointer-events-none z-10' />
          <Input
            type='text'
            placeholder='Buscar nombre o email...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-10'
          />
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <section className='bg-surface-container-lowest rounded-[2rem] shadow-kinetic overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow className='bg-surface-container-low/50 hover:bg-surface-container-low/50 border-none'>
              <TableHead>Suscriptor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Pago MP</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : error ? (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={6} className='py-16 text-center'>
                  <p className='font-body font-semibold text-sm text-destructive'>{error}</p>
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={6} className='py-16 text-center'>
                  <div className='flex flex-col items-center gap-3 text-on-surface-variant'>
                    <Users className='h-10 w-10 opacity-30' />
                    <p className='font-body font-semibold text-sm'>
                      {search ? 'Sin resultados para esa búsqueda' : 'Aún no hay suscripciones'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paged.map((sub) => {
                const latestPayment = sub.payments[0] ?? null;
                const statusCfg = STATUS_CONFIG[sub.status];
                const expiring = sub.status === 'ACTIVE' && isExpiringSoon(sub.endDate);

                return (
                  <TableRow key={sub.id}>

                    {/* Suscriptor */}
                    <TableCell>
                      <div className='flex items-center gap-4'>
                        {sub.user.image ? (
                          <img
                            src={sub.user.image}
                            alt={sub.user.name}
                            className='w-12 h-12 rounded-2xl object-cover shrink-0 shadow-sm'
                          />
                        ) : (
                          <div className='w-12 h-12 rounded-2xl bg-primary/[0.08] flex items-center justify-center shrink-0'>
                            <span className='font-headline font-black text-sm text-primary'>
                              {getInitials(sub.user.name)}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className='font-body font-bold text-on-surface'>{sub.user.name}</p>
                          <p className='text-xs font-body font-medium text-on-surface-variant'>
                            {sub.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Estado */}
                    <TableCell>
                      <div className='flex flex-col gap-1'>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        {expiring && (
                          <span className='text-[10px] font-body font-bold text-amber-600 flex items-center gap-1'>
                            <Clock className='h-3 w-3' />
                            Vence pronto
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Plan */}
                    <TableCell>
                      <p className='font-body font-bold text-sm text-on-surface'>{sub.plan.name}</p>
                      <p className='text-xs font-body font-medium text-on-surface-variant'>
                        {sub.plan.billingPeriod === 'MONTHLY' ? 'Mensual' : 'Anual'}
                        {' · '}
                        {latestPayment
                          ? `${latestPayment.currency} ${Number(latestPayment.amount).toLocaleString('es-AR')}`
                          : `ARS ${Number(sub.plan.priceArs).toLocaleString('es-AR')}`
                        }
                      </p>
                    </TableCell>

                    {/* Pago MP */}
                    <TableCell>
                      {latestPayment ? (
                        <div className='space-y-1'>
                          <div className='flex items-center gap-1.5'>
                            <CreditCard className='h-3.5 w-3.5 text-on-surface-variant shrink-0' />
                            <span className='text-xs font-body font-semibold text-on-surface-variant'>
                              {GATEWAY_LABEL[latestPayment.gateway]}
                            </span>
                          </div>
                          {latestPayment.payerEmail && (
                            <div className='flex items-center gap-1.5'>
                              <Mail className='h-3.5 w-3.5 text-on-surface-variant/60 shrink-0' />
                              <span className='text-xs font-body text-on-surface-variant truncate block max-w-full'>
                                {latestPayment.payerEmail}
                              </span>
                            </div>
                          )}
                          {latestPayment.gatewayPaymentId && (
                            <div className='flex items-center gap-1.5'>
                              <Hash className='h-3.5 w-3.5 text-on-surface-variant/60 shrink-0' />
                              <span className='text-xs font-body text-on-surface-variant/70 font-mono'>
                                {latestPayment.gatewayPaymentId}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className='text-sm font-body text-on-surface-variant/50'>—</span>
                      )}
                    </TableCell>

                    {/* Vencimiento */}
                    <TableCell>
                      {sub.status === 'ACTIVE' ? (
                        <span className={`text-sm font-body font-semibold ${expiring ? 'text-amber-600' : 'text-on-surface-variant'}`}>
                          {formatDate(sub.endDate)}
                        </span>
                      ) : sub.status === 'CANCELLED' ? (
                        <span className='text-sm font-body text-on-surface-variant/60'>
                          Canceló {formatDate(sub.cancelledAt)}
                        </span>
                      ) : (
                        <span className='text-sm font-body text-on-surface-variant'>
                          {formatDate(sub.endDate)}
                        </span>
                      )}
                    </TableCell>

                    {/* Acciones */}
                    <TableCell>
                      {!sub.user.isActivated && (
                        <Button
                          size='sm'
                          variant='outline'
                          className='text-xs font-body font-bold gap-1.5'
                          disabled={resendingId === sub.id}
                          onClick={() => handleResendActivation(sub.user.email, sub.id)}
                        >
                          <Mail className='h-3.5 w-3.5' />
                          {resentId === sub.id
                            ? '¡Enviado!'
                            : resendingId === sub.id
                              ? 'Enviando...'
                              : 'Reenviar activación'
                          }
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Table footer */}
        <div className='bg-surface-container-highest px-8 py-4 flex items-center justify-between'>
          <p className='text-sm font-body font-semibold text-on-surface-variant'>
            {loading ? '...' : `${filtered.length} suscripción${filtered.length !== 1 ? 'es' : ''}`}
          </p>

          {totalPages > 1 && (
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className='w-10 h-10 rounded-xl bg-surface-container-lowest text-on-surface-variant hover:text-primary'
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>

              {visiblePages.map((p) => (
                <Button
                  key={p}
                  size='icon'
                  variant={p === page ? 'default' : 'ghost'}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-xl font-body font-bold ${
                    p !== page && 'bg-surface-container-lowest text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {p}
                </Button>
              ))}

              <Button
                variant='ghost'
                size='icon'
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className='w-10 h-10 rounded-xl bg-surface-container-lowest text-on-surface-variant hover:text-primary'
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── Tip card ────────────────────────────────────────────────────── */}
      <div className='bg-primary p-8 rounded-[2rem] text-on-primary relative overflow-hidden group'>
        <div className='absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-700' />
        <div className='relative z-10 flex items-start gap-4'>
          <Zap className='h-6 w-6 shrink-0 mt-0.5 fill-on-primary/20' />
          <div>
            <h4 className='text-xl font-headline font-black mb-1'>Sobre las membresías</h4>
            <p className='text-on-primary/80 font-body text-sm leading-relaxed'>
              Las suscripciones <strong>Pendientes</strong> son pagos iniciados pero no confirmados — se activan automáticamente cuando el pago es aprobado por la pasarela. Las <strong>vencidas</strong> perdieron acceso al dashboard de suscriptor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuscriptoresPage;
