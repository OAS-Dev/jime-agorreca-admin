import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-[10px] font-body font-black uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-secondary-container text-on-secondary-container',
        error: 'bg-destructive/10 text-destructive',
        neutral: 'bg-surface-container-high text-on-surface-variant',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
