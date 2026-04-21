'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

const Calendar = ({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) => {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-4', className)}
      classNames={{
        months: 'flex flex-col space-y-4',
        month: 'space-y-3',
        caption: 'flex justify-center pt-1 relative items-center mb-1',
        caption_label: 'font-headline text-sm font-bold text-on-surface',
        nav: 'flex items-center',
        nav_button: cn(
          'h-7 w-7 rounded-xl flex items-center justify-center transition-colors',
          'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse',
        head_row: 'flex mb-1',
        head_cell: 'text-on-surface-variant font-body font-semibold text-[11px] uppercase tracking-wide w-9 text-center',
        row: 'flex w-full mt-1',
        cell: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
          '[&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl',
        ),
        day: cn(
          'h-9 w-9 rounded-xl font-body font-medium text-sm transition-colors',
          'hover:bg-surface-container-low hover:text-on-surface',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          'aria-selected:opacity-100',
        ),
        day_selected: 'bg-primary text-on-primary hover:bg-primary hover:text-on-primary font-bold',
        day_today: 'text-primary font-bold',
        day_outside: 'text-on-surface-variant/40',
        day_disabled: 'text-on-surface-variant/30 pointer-events-none',
        day_range_middle: 'aria-selected:bg-primary/10 aria-selected:text-on-surface',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
