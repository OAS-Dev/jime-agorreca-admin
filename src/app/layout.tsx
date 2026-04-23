import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Manrope, Fraunces, JetBrains_Mono } from 'next/font/google'
import { SessionProvider } from '@/components/providers/session-provider'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-headline',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Admin | Jime Agorreca',
  description: 'Panel de administración — Jime Agorreca CMS',
}

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) => {
  return (
    <html lang="es" className="h-full">
      <body className={`${plusJakartaSans.variable} ${manrope.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}

export default RootLayout
