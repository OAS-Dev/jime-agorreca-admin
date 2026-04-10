import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Manrope } from 'next/font/google';
import { SessionProvider } from '@/components/providers/session-provider';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-headline',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Admin | Jime Agorreca',
  description: 'Panel de administración — Jime Agorreca CMS',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='es' className='h-full'>
      <body
        className={`${plusJakartaSans.variable} ${manrope.variable} antialiased h-full`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
