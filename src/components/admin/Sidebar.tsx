'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, ShieldCheck, Users, HelpCircle, LogOut, FileText, PenLine, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const mainItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
];

const blogItems = [
  { href: '/blog',        label: 'Notas',         icon: FileText },
  { href: '/blog/nuevo',  label: 'Nueva nota',    icon: PenLine },
];

const userItems = [
  { href: '/usuarios/equipo',        label: 'Equipo',        icon: ShieldCheck },
  { href: '/usuarios/suscriptores',  label: 'Suscriptores',  icon: Users },
];

const NavItem = ({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) => {
  return (
    <Link
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
}

export const Sidebar = () => {
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
        {mainItems.map(({ href, label, icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={pathname === href}
          />
        ))}

        {/* Sección Blog */}
        <div className='pt-4'>
          <p className='px-4 pb-2 text-[10px] font-body font-black uppercase tracking-widest text-on-surface-variant/50'>
            Blog
          </p>
          {blogItems.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={href === '/blog' ? pathname === '/blog' : pathname.startsWith(href)}
            />
          ))}
        </div>

        {/* Sección Usuarios */}
        <div className='pt-4'>
          <p className='px-4 pb-2 text-[10px] font-body font-black uppercase tracking-widest text-on-surface-variant/50'>
            Usuarios
          </p>
          {userItems.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={pathname.startsWith(href)}
            />
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className='pt-6 mt-auto space-y-2'>
        <div className='p-4 bg-surface-container-low rounded-xl'>
          <p className='text-[10px] font-body font-bold text-on-surface-variant uppercase tracking-widest mb-2'>
            Soporte
          </p>
          <Button variant='ghost' size='sm' className='w-full justify-start text-primary hover:text-primary/80 hover:bg-transparent font-body font-semibold px-0'>
            <HelpCircle className='h-4 w-4' />
            Centro de Ayuda
          </Button>
        </div>
        <Button
          variant='ghost'
          onClick={() => signOut({ callbackUrl: '/login' })}
          className='w-full justify-start px-4 font-body font-semibold text-on-surface-variant hover:bg-destructive/[0.06] hover:text-destructive'
        >
          <LogOut className='h-4 w-4' />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
