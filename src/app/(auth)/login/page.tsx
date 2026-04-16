'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const LoginPage = () => {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const password = form.get('password') as string

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Credenciales incorrectas o sin permisos de acceso.')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen">
      {/* ── LEFT PANEL — Editorial Brand ── */}
      <div className="relative hidden flex-col overflow-hidden lg:flex lg:w-[52%]">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#0f0a0d_0%,#1e0b17_35%,#380d2a_65%,#5c1040_100%)]" />

        {/* Dot grid — texture cartográfica */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Ambient blobs */}
        <div className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-20 top-1/2 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-primary-container/10 blur-2xl" />

        {/* JA Badge — top left */}
        <div className="relative z-10 p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-2xl">
            <span className="font-headline text-xl font-black tracking-tighter text-primary">
              JA
            </span>
          </div>
        </div>

        {/* Hero copy — bottom */}
        <div className="relative z-10 mt-auto p-10 pb-16">
          <div className="mb-6">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 font-body text-xs font-semibold uppercase tracking-widest text-white/80 backdrop-blur-md">
              Digital Strategy
            </span>
          </div>
          <h2 className="mb-5 max-w-sm font-headline text-5xl font-extrabold leading-[1.1] tracking-tight text-white">
            Elevando marcas personales al siguiente nivel.
          </h2>
          <p className="max-w-xs font-body text-lg leading-relaxed text-white/60">
            Gestión integral de redes sociales y curaduría visual para creadores premium.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ── */}
      <div className="flex w-full items-center justify-center bg-surface-container-lowest px-6 py-12 md:px-16 lg:w-[48%] lg:px-20">
        <div className="w-full max-w-[400px]">
          {/* Logo — mobile */}
          <div className="mb-10 flex justify-center lg:hidden">
            <Image
              src="/images/logo_navbar_mobile.webp"
              alt="Jime Agorreca"
              width={80}
              height={80}
              className="h-16 w-auto"
              priority
            />
          </div>

          {/* Logo — desktop */}
          <div className="mb-10 hidden lg:flex">
            <Image
              src="/images/logo_navbar_desktop.webp"
              alt="Jime Agorreca"
              width={140}
              height={100}
              className="h-10 w-auto"
              priority
            />
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="mb-2 font-headline text-3xl font-extrabold tracking-tight text-on-surface">
              Acceso al CMS
            </h1>
            <p className="font-body text-base text-on-surface-variant">
              Ingresá tus credenciales para gestionar tu marca.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/8 mb-6 flex items-center gap-3 rounded-xl border border-destructive/20 px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="font-body text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ejemplo@jimeagorreca.com"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 font-body text-xs font-bold uppercase tracking-wide text-primary"
                >
                  ¿Olvidaste la clave?
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="pr-12"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-outline transition-colors hover:text-primary"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center space-x-3 pt-1">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={loading}
              />
              <label
                htmlFor="remember"
                className="cursor-pointer select-none font-body text-sm text-on-surface-variant transition-colors hover:text-on-surface"
              >
                Mantener sesión iniciada
              </label>
            </div>

            {/* CTA */}
            <Button
              type="submit"
              size="xl"
              className="mt-2 w-full rounded-2xl shadow-kinetic-primary"
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Ingresar al Panel'}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-12 flex flex-col gap-5 border-t border-surface-container pt-8">
            <div className="flex flex-col gap-1">
              <p className="font-body text-xs text-on-surface-variant/60">
                © {new Date().getFullYear()} Jime Agorreca. Todos los derechos reservados.
              </p>
              <p className="font-body text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">
                Acceso restringido para personal autorizado
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
