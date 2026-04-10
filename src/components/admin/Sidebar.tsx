'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Users, HelpCircle, LogOut } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/usuarios', label: 'Usuarios', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className='h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest shadow-kinetic flex flex-col p-6 z-50'>

      {/* Brand */}
      <div className='mb-10 px-2 flex items-center gap-3'>
        <div className='w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-kinetic-primary shrink-0'>
          <span className='text-on-primary font-headline font-black text-base'>JA</span>
        </div>
        <div>
          <h1 className='text-sm font-headline font-extrabold text-on-surface tracking-tight leading-none'>
            Jime Agorreca
          </h1>
          <p className='text-[10px] font-body font-bold text-on-surface-variant uppercase tracking-widest mt-1'>
            Admin Panel
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className='flex-1 space-y-1'>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-headline font-bold transition-all duration-150 ${
                active
                  ? 'bg-primary/[0.08] text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <Icon className='h-5 w-5 shrink-0' />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className='pt-6 mt-auto space-y-2'>
        <div className='p-4 bg-surface-container-low rounded-xl'>
          <p className='text-[10px] font-body font-bold text-on-surface-variant uppercase tracking-widest mb-2'>
            Soporte
          </p>
          <button className='w-full text-left text-sm font-body font-semibold text-primary flex items-center gap-2 hover:text-primary/80 transition-colors'>
            <HelpCircle className='h-4 w-4' />
            Centro de Ayuda
          </button>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className='w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body font-semibold text-on-surface-variant hover:bg-destructive/[0.06] hover:text-destructive transition-all duration-150'
        >
          <LogOut className='h-4 w-4' />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
