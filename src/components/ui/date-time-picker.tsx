'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DateTimePickerProps {
  value: string        // ISO string o ''
  onChange: (iso: string) => void
  placeholder?: string
  className?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

export const DateTimePicker = ({
  value,
  onChange,
  placeholder = 'Seleccioná fecha y hora',
  className,
}: DateTimePickerProps) => {
  const [open, setOpen] = React.useState(false)

  // Derivamos date y time del ISO string
  const date = value ? new Date(value) : undefined
  const timeStr = date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '18:00'

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return
    // Preservar la hora actual si ya existe
    const [h, m] = timeStr.split(':').map(Number)
    day.setHours(h, m, 0, 0)
    onChange(day.toISOString())
    // No cerramos — el usuario todavía puede ajustar la hora
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(':').map(Number)
    const base = date ?? new Date()
    base.setHours(h, m, 0, 0)
    onChange(base.toISOString())
  }

  const displayLabel = date
    ? format(date, "EEEE d 'de' MMMM, HH:mm", { locale: es }).replace(/^\w/, c => c.toUpperCase())
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-xl border border-outline-variant bg-transparent px-3 text-sm font-body transition-colors',
            'hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            !date && 'text-on-surface-variant/60',
            date && 'text-on-surface',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-on-surface-variant" />
          <span className="flex-1 text-left">{displayLabel}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDaySelect}
          locale={es}
          initialFocus
        />

        {/* Time picker */}
        <div
          className="flex items-center gap-3 border-t border-outline-variant/40 px-4 py-3"
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-on-surface-variant" />
          <span className="text-sm font-body text-on-surface-variant">Hora</span>
          <input
            type="time"
            value={timeStr}
            onChange={handleTimeChange}
            className={cn(
              'ml-auto h-8 rounded-xl border border-outline-variant bg-transparent px-3 text-sm font-body text-on-surface',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            )}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
