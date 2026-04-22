'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Loader2,
  CreditCard,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Types ─────────────────────────────────────────────────────────────────────

type BillingPeriod = 'MONTHLY' | 'ANNUAL'

interface Plan {
  id: string
  name: string
  priceArs: string
  priceUsd: string
  billingPeriod: BillingPeriod
  features: string[]
  isActive: boolean
  createdAt: string
}

interface PlanFormData {
  name: string
  priceArs: string
  priceUsd: string
  billingPeriod: BillingPeriod
  features: string   // textarea — cada línea es un feature
}

const EMPTY_FORM: PlanFormData = {
  name: '',
  priceArs: '',
  priceUsd: '',
  billingPeriod: 'MONTHLY',
  features: '',
}

const BILLING_LABELS: Record<BillingPeriod, string> = {
  MONTHLY: 'Mensual',
  ANNUAL: 'Anual',
}

// ── Plan Form Modal ───────────────────────────────────────────────────────────

const PlanModal = ({
  open,
  onClose,
  onSuccess,
  token,
  editing,
}: {
  open: boolean
  onClose: () => void
  onSuccess: (plan: Plan) => void
  token: string
  editing: Plan | null
}) => {
  const [form, setForm] = useState<PlanFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          priceArs: String(Number(editing.priceArs)),
          priceUsd: String(Number(editing.priceUsd)),
          billingPeriod: editing.billingPeriod,
          features: editing.features.join('\n'),
        })
      } else {
        setForm(EMPTY_FORM)
      }
      setError(null)
    }
  }, [open, editing])

  const handleSave = async () => {
    setError(null)
    const priceArs = parseFloat(form.priceArs)
    const priceUsd = parseFloat(form.priceUsd)

    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (isNaN(priceArs) || priceArs <= 0) { setError('Precio ARS inválido'); return }
    if (isNaN(priceUsd) || priceUsd <= 0) { setError('Precio USD inválido'); return }

    const features = form.features
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)

    const payload = {
      name: form.name.trim(),
      priceArs,
      priceUsd,
      billingPeriod: form.billingPeriod,
      features,
    }

    setSaving(true)
    try {
      if (editing) {
        const { data } = await api.patch<{ plan: Plan }>(
          `/subscriptions/plans/${editing.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        onSuccess(data.plan)
      } else {
        const { data } = await api.post<{ plan: Plan }>(
          '/subscriptions/plans',
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        onSuccess(data.plan)
      }
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al guardar el plan'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof PlanFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar plan' : 'Nuevo plan'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Modificá los datos del plan. Los cambios afectan a nuevas suscripciones.'
              : 'Creá un nuevo plan de suscripción.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-2 pt-1">
          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="font-body text-xs font-bold text-on-surface-variant">
              Nombre del plan *
            </label>
            <Input
              placeholder="ej. Ninja Pro"
              value={form.name}
              onChange={set('name')}
              disabled={saving}
            />
          </div>

          {/* Precios */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-body text-xs font-bold text-on-surface-variant">
                Precio ARS *
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm font-semibold text-on-surface-variant">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="47000"
                  value={form.priceArs}
                  onChange={set('priceArs')}
                  disabled={saving}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-body text-xs font-bold text-on-surface-variant">
                Precio USD *
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm font-semibold text-on-surface-variant">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="47"
                  value={form.priceUsd}
                  onChange={set('priceUsd')}
                  disabled={saving}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Período */}
          <div className="space-y-1.5">
            <label className="font-body text-xs font-bold text-on-surface-variant">
              Período de facturación
            </label>
            <Select
              value={form.billingPeriod}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, billingPeriod: v as BillingPeriod }))
              }
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Mensual</SelectItem>
                <SelectItem value="ANNUAL">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Features */}
          <div className="space-y-1.5">
            <label className="font-body text-xs font-bold text-on-surface-variant">
              Beneficios{' '}
              <span className="font-normal opacity-60">— uno por línea</span>
            </label>
            <Textarea
              placeholder={`Acceso a todas las sesiones grabadas\nVideoteca completa\nRecursos descargables`}
              value={form.features}
              onChange={set('features')}
              disabled={saving}
              rows={5}
              className="resize-none font-body text-sm"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 font-body text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

const PlanCard = ({
  plan,
  onEdit,
  onToggle,
  toggling,
}: {
  plan: Plan
  onEdit: (plan: Plan) => void
  onToggle: (plan: Plan) => void
  toggling: boolean
}) => {
  const priceArs = Number(plan.priceArs).toLocaleString('es-AR', { maximumFractionDigits: 0 })
  const priceUsd = Number(plan.priceUsd).toLocaleString('en-US', { maximumFractionDigits: 2 })

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] transition-all ${
        plan.isActive
          ? 'bg-surface-container-lowest shadow-kinetic'
          : 'bg-surface-container-low opacity-70'
      }`}
    >
      {/* Top accent */}
      <div
        className={`h-1.5 w-full ${plan.isActive ? 'bg-primary' : 'bg-outline-variant'}`}
      />

      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-headline text-xl font-extrabold text-on-surface">{plan.name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant={plan.isActive ? 'success' : 'neutral'}>
                {plan.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
              <span className="font-body text-xs font-bold text-on-surface-variant">
                {BILLING_LABELS[plan.billingPeriod]}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(plan)}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggle(plan)}
              disabled={toggling}
              title={plan.isActive ? 'Desactivar' : 'Activar'}
              className={plan.isActive ? 'text-on-surface-variant hover:text-destructive' : 'text-on-surface-variant hover:text-green-600'}
            >
              {toggling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : plan.isActive ? (
                <ToggleRight className="h-5 w-5 text-green-600" />
              ) : (
                <ToggleLeft className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-container-low p-4">
            <p className="font-body text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Precio ARS
            </p>
            <p className="mt-1 font-headline text-2xl font-black text-on-surface">
              ${priceArs}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-container-low p-4">
            <p className="font-body text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Precio USD
            </p>
            <p className="mt-1 font-headline text-2xl font-black text-on-surface">
              ${priceUsd}
            </p>
          </div>
        </div>

        {/* Features */}
        {plan.features.length > 0 && (
          <div className="space-y-2">
            <p className="font-body text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Beneficios
            </p>
            <ul className="space-y-1.5">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                  <span className="font-body text-sm text-on-surface">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PlanesPage = () => {
  const { data: session } = useSession()
  const token = session?.backendToken ?? ''

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    api
      .get<{ plans: Plan[] }>('/subscriptions/plans/admin', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => setPlans(data.plans))
      .catch((err) =>
        setError(err?.response?.data?.message ?? err?.message ?? 'Error al cargar planes'),
      )
      .finally(() => setLoading(false))
  }, [token])

  const handleToggle = async (plan: Plan) => {
    setTogglingId(plan.id)
    try {
      const { data } = await api.patch<{ plan: Plan }>(
        `/subscriptions/plans/${plan.id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setPlans((prev) => prev.map((p) => (p.id === data.plan.id ? data.plan : p)))
    } catch {
      // silencioso
    } finally {
      setTogglingId(null)
    }
  }

  const handleCreated = (plan: Plan) => setPlans((prev) => [...prev, plan])

  const handleUpdated = (plan: Plan) =>
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)))

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (plan: Plan) => { setEditing(plan); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null) }

  const activePlan = plans.find((p) => p.isActive)

  return (
    <div className="space-y-10 p-4 sm:p-6 lg:p-10 xl:p-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Planes y Precios
          </h2>
          <p className="font-body font-medium text-on-surface-variant">
            Gestioná los planes de membresía disponibles en la plataforma.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nuevo plan
        </Button>
      </div>

      {/* Active plan notice */}
      {!loading && activePlan && (
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <CreditCard className="h-4 w-4 text-green-700" />
          </div>
          <div>
            <p className="font-body text-sm font-bold text-green-800">
              Plan activo: {activePlan.name}
            </p>
            <p className="font-body text-xs text-green-700">
              Este es el plan que se asigna a los nuevos suscriptores al pagar.
            </p>
          </div>
        </div>
      )}

      {!loading && !activePlan && plans.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="font-body text-sm font-bold text-amber-800">
            No hay ningún plan activo. Activá un plan para que los suscriptores puedan acceder.
          </p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-kinetic">
              <div className="h-1.5 w-full bg-surface-container-high" />
              <div className="space-y-4 p-8">
                <div className="h-5 w-40 rounded-full bg-surface-container-high" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 rounded-2xl bg-surface-container-low" />
                  <div className="h-20 rounded-2xl bg-surface-container-low" />
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-3 w-full rounded-full bg-surface-container-high" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 px-5 py-4 font-body font-semibold text-destructive">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[2rem] bg-surface-container-lowest px-8 py-20 text-center shadow-kinetic">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-headline text-lg font-extrabold text-on-surface">
              Sin planes configurados
            </p>
            <p className="font-body text-sm text-on-surface-variant">
              Creá el primer plan para que las usuarias puedan suscribirse.
            </p>
          </div>
          <Button onClick={openNew} className="mt-2 gap-2">
            <Plus className="h-4 w-4" />
            Crear primer plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={openEdit}
              onToggle={handleToggle}
              toggling={togglingId === plan.id}
            />
          ))}
        </div>
      )}

      <PlanModal
        open={modalOpen}
        onClose={closeModal}
        onSuccess={editing ? handleUpdated : handleCreated}
        token={token}
        editing={editing}
      />
    </div>
  )
}

export default PlanesPage
