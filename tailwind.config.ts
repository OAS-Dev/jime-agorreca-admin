import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        headline: ['var(--font-headline)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        fraunces: ['var(--font-fraunces)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // shadcn CSS variable system
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Design system tokens — Kinetic Editorial (mirrored from frontend)
        'on-primary': '#ffeff1',
        'primary-container': '#ff709c',
        'on-primary-container': '#4c0020',
        'secondary-container': '#f8e53e',
        'on-secondary-container': '#5b5300',
        'secondary-fixed': '#f8e53e',
        'surface-bright': '#f5f6f7',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eff1f2',
        'surface-container': '#e6e8ea',
        'surface-container-high': '#e0e3e4',
        'surface-container-highest': '#dadddf',
        'on-surface': '#2c2f30',
        'on-surface-variant': '#595c5d',
        'outline-variant': '#abadae',
        'outline': '#757778',
        // Claude Design tokens (mirrors frontend — usar con var() o clase directa)
        'magenta': 'var(--magenta)',
        'magenta-deep': 'var(--magenta-deep)',
        'magenta-soft': 'var(--magenta-soft)',
        'yellow': 'var(--yellow)',
        'yellow-soft': 'var(--yellow-soft)',
        'ink': 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        'ink-muted': 'var(--ink-muted)',
        'cream': 'var(--cream)',
        'paper': 'var(--paper)',
        'line': 'var(--line)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      boxShadow: {
        'kinetic': '0px 20px 40px rgba(44, 47, 48, 0.06)',
        'kinetic-primary': '0 8px 24px rgba(181, 0, 86, 0.25)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
