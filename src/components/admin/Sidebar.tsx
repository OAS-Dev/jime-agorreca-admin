'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  HelpCircle,
  LogOut,
  FileText,
  PenLine,
  PlaySquare,
  FolderOpen,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const mainItems = [{ href: '/dashboard', label: 'Inicio', icon: LayoutDashboard }]

const blogItems = [
  { href: '/blog', label: 'Notas', icon: FileText },
  { href: '/blog/nuevo', label: 'Nueva nota', icon: PenLine },
]

const videoItems = [
  { href: '/videos', label: 'Videoteca', icon: PlaySquare },
  { href: '/categorias', label: 'Categorías', icon: FolderOpen },
]

const userItems = [
  { href: '/usuarios/equipo', label: 'Equipo', icon: ShieldCheck },
  { href: '/usuarios/suscriptores', label: 'Suscriptores', icon: Users },
]

const NavItem = ({
  href,
  label,
  icon: Icon,
  active,
  onClose,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  onClose?: () => void
}) => {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 font-headline text-sm font-bold transition-all duration-150 ${
        active
          ? 'bg-primary/[0.08] text-primary'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  )
}

export const Sidebar = () => {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Hamburger button — mobile only, shown when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-lowest shadow-kinetic md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5 text-on-surface" />
        </button>
      )}

      {/* Backdrop overlay — mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-surface-container-lowest p-6 shadow-kinetic transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand — with X button on mobile when open */}
        <div className="mb-10 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-kinetic-primary">
              <span className="font-headline text-base font-black text-on-primary">JA</span>
            </div>
            <div>
              <h1 className="font-headline text-sm font-extrabold leading-none tracking-tight text-on-surface">
                Jime Agorreca
              </h1>
              <p className="mt-1 font-body text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Admin Panel
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:text-on-surface md:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {mainItems.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={pathname === href}
              onClose={() => setIsOpen(false)}
            />
          ))}

          {/* Sección Blog */}
          <div className="pt-4">
            <p className="px-4 pb-2 font-body text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
              Blog
            </p>
            {blogItems.map(({ href, label, icon }) => (
              <NavItem
                key={href}
                href={href}
                label={label}
                icon={icon}
                active={href === '/blog' ? pathname === '/blog' : pathname.startsWith(href)}
                onClose={() => setIsOpen(false)}
              />
            ))}
          </div>

          {/* Sección Videos */}
          <div className="pt-4">
            <p className="px-4 pb-2 font-body text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
              Videos
            </p>
            {videoItems.map(({ href, label, icon }) => (
              <NavItem
                key={href}
                href={href}
                label={label}
                icon={icon}
                active={pathname.startsWith(href)}
                onClose={() => setIsOpen(false)}
              />
            ))}
          </div>

          {/* Sección Usuarios */}
          <div className="pt-4">
            <p className="px-4 pb-2 font-body text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
              Usuarios
            </p>
            {userItems.map(({ href, label, icon }) => (
              <NavItem
                key={href}
                href={href}
                label={label}
                icon={icon}
                active={pathname.startsWith(href)}
                onClose={() => setIsOpen(false)}
              />
            ))}
          </div>
        </nav>

        {/* Bottom */}
        <div className="mt-auto space-y-2 pt-6">
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="mb-2 font-body text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Soporte
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-0 font-body font-semibold text-primary hover:bg-transparent hover:text-primary/80"
            >
              <HelpCircle className="h-4 w-4" />
              Centro de Ayuda
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full justify-start px-4 font-body font-semibold text-on-surface-variant hover:bg-destructive/[0.06] hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
    </>
  )
}
