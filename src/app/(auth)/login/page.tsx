'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get('email') as string;
    const password = form.get('password') as string;

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Credenciales incorrectas o sin permisos de acceso.');
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className='flex min-h-screen'>

      {/* ── LEFT PANEL — Editorial Brand ── */}
      <div className='hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col'>

        {/* Gradient base */}
        <div className='absolute inset-0 bg-[linear-gradient(160deg,#0f0a0d_0%,#1e0b17_35%,#380d2a_65%,#5c1040_100%)]' />

        {/* Dot grid — texture cartográfica */}
        <div
          className='absolute inset-0 opacity-[0.07]'
          style={{
            backgroundImage:
              'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Ambient blobs */}
        <div className='absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-primary/10 blur-3xl' />
        <div className='absolute top-1/2 -right-20 w-72 h-72 rounded-full bg-primary/20 blur-3xl' />
        <div className='absolute -bottom-20 left-1/3 w-80 h-80 rounded-full bg-primary-container/10 blur-2xl' />

        {/* JA Badge — top left */}
        <div className='relative z-10 p-10'>
          <div className='w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl'>
            <span className='text-primary font-headline font-black text-xl tracking-tighter'>
              JA
            </span>
          </div>
        </div>

        {/* Hero copy — bottom */}
        <div className='relative z-10 mt-auto p-10 pb-16'>
          <div className='mb-6'>
            <span className='inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-body font-semibold text-white/80 uppercase tracking-widest'>
              Digital Strategy
            </span>
          </div>
          <h2 className='text-5xl font-headline font-extrabold text-white tracking-tight leading-[1.1] mb-5 max-w-sm'>
            Elevando marcas personales al siguiente nivel.
          </h2>
          <p className='text-lg font-body text-white/60 max-w-xs leading-relaxed'>
            Gestión integral de redes sociales y curaduría visual para creadores premium.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ── */}
      <div className='w-full lg:w-[48%] flex items-center justify-center bg-surface-container-lowest px-6 py-12 md:px-16 lg:px-20'>
        <div className='w-full max-w-[400px]'>

          {/* Logo — mobile */}
          <div className='flex justify-center mb-10 lg:hidden'>
            <Image
              src='/images/logo_navbar_mobile.webp'
              alt='Jime Agorreca'
              width={80}
              height={80}
              className='h-16 w-auto'
              priority
            />
          </div>

          {/* Logo — desktop */}
          <div className='hidden lg:flex mb-10'>
            <Image
              src='/images/logo_navbar_desktop.webp'
              alt='Jime Agorreca'
              width={140}
              height={100}
              className='h-10 w-auto'
              priority
            />
          </div>

          {/* Header */}
          <div className='mb-10'>
            <h1 className='text-3xl font-headline font-extrabold text-on-surface tracking-tight mb-2'>
              Acceso al CMS
            </h1>
            <p className='text-on-surface-variant font-body text-base'>
              Ingresá tus credenciales para gestionar tu marca.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className='flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-destructive/8 border border-destructive/20'>
              <AlertCircle className='h-4 w-4 text-destructive shrink-0' />
              <p className='text-sm font-body text-destructive'>{error}</p>
            </div>
          )}

          {/* Form */}
          <form className='space-y-6' onSubmit={handleSubmit}>

            {/* Email */}
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                name='email'
                type='email'
                placeholder='ejemplo@jimeagorreca.com'
                autoComplete='email'
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='password'>Contraseña</Label>
                <Button
                  type='button'
                  variant='link'
                  size='sm'
                  className='h-auto p-0 text-xs font-body font-bold uppercase tracking-wide text-primary'
                >
                  ¿Olvidaste la clave?
                </Button>
              </div>
              <div className='relative'>
                <Input
                  id='password'
                  name='password'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='••••••••••••'
                  autoComplete='current-password'
                  className='pr-12'
                  required
                  disabled={loading}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword((v) => !v)}
                  className='absolute inset-y-0 right-0 flex items-center pr-4 text-outline hover:text-primary transition-colors'
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className='flex items-center space-x-3 pt-1'>
              <Checkbox
                id='remember'
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={loading}
              />
              <label
                htmlFor='remember'
                className='text-sm font-body text-on-surface-variant cursor-pointer select-none hover:text-on-surface transition-colors'
              >
                Mantener sesión iniciada
              </label>
            </div>

            {/* CTA */}
            <Button
              type='submit'
              size='xl'
              className='w-full mt-2 rounded-2xl shadow-kinetic-primary'
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Ingresar al Panel'}
              {!loading && <ArrowRight className='h-5 w-5' />}
            </Button>
          </form>

          {/* Footer */}
          <div className='mt-12 pt-8 border-t border-surface-container flex flex-col gap-5'>
            <div className='flex flex-col gap-1'>
              <p className='text-xs font-body text-on-surface-variant/60'>
                © {new Date().getFullYear()} Jime Agorreca. Todos los derechos reservados.
              </p>
              <p className='text-[10px] font-body font-bold text-on-surface-variant/40 uppercase tracking-widest'>
                Acceso restringido para personal autorizado
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
