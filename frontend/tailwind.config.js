/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    {
      pattern: /(bg|text|border|from|to|via|ring|hover:bg|hover:text|focus:ring|focus:border)-(primary|secondary|success|error|warning|accent|info)-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    {
      pattern: /(bg|text|border|from|to|ring|hover:bg|hover:text|focus:ring|focus:border)-(gray|slate|white|black)-(50|100|200|300|400|500|600|700|800|900|950)?/,
    },
  ],
  theme: {
    extend: {
      colors: {
        /* ── Midnight Emerald ─────────────────────────── */
        primary: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        /* ── Slate Charcoal ───────────────────────────── */
        secondary: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        /* ── Warm Gold / Amber ────────────────────────── */
        accent: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        gray: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        error: {
          50:  '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
          800: '#991b1b', 900: '#7f1d1d',
        },
        success: {
          50:  '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d',
        },
        warning: {
          50:  '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f',
        },
        info: {
          50:  '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a',
        },
      },

      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        urdu:    ['"Noto Nastaliq Urdu"', 'serif'],
      },

      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '0.9rem' }],
      },

      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      backdropBlur: {
        xs: '2px',
      },

      boxShadow: {
        'glow-sm':    '0 0 15px -3px rgba(16,185,129,0.15)',
        'glow':       '0 0 25px -5px rgba(16,185,129,0.20)',
        'glow-lg':    '0 0 40px -8px rgba(16,185,129,0.25)',
        'glow-accent':'0 0 25px -5px rgba(245,158,11,0.2)',
        'inner-glow': 'inset 0 1px 2px 0 rgba(16,185,129,0.06)',
        'soft':       '0 2px 15px -3px rgba(0,0,0,0.04), 0 2px 6px -2px rgba(0,0,0,0.03)',
        'medium':     '0 4px 25px -5px rgba(0,0,0,0.06), 0 4px 10px -4px rgba(0,0,0,0.04)',
        'strong':     '0 10px 40px -10px rgba(0,0,0,0.1), 0 4px 15px -4px rgba(0,0,0,0.06)',
        'elevated':   '0 20px 60px -15px rgba(0,0,0,0.12), 0 8px 20px -6px rgba(0,0,0,0.06)',
      },

      backgroundImage: {
        'hero-light':
          'radial-gradient(circle at 12% 8%, rgba(16,185,129,0.18), transparent 42%), radial-gradient(circle at 88% 18%, rgba(245,158,11,0.14), transparent 40%), linear-gradient(180deg, #f8fafb 0%, #f1f5f9 100%)',
      },

      animation: {
        'fade-in':        'fadeIn 0.6s cubic-bezier(0.16,1,0.3,1)',
        'fade-in-up':     'fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1)',
        'fade-in-down':   'fadeInDown 0.5s cubic-bezier(0.16,1,0.3,1)',
        'slide-up':       'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
        'slide-down':     'slideDown 0.5s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-left':  'slideInLeft 0.5s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':       'scaleIn 0.4s cubic-bezier(0.16,1,0.3,1)',
        'bounce-in':      'bounceIn 0.8s cubic-bezier(0.175,0.885,0.32,1.275)',
        'float':          'float 6s ease-in-out infinite',
        'float-slow':     'float 10s ease-in-out infinite',
        'pulse-subtle':   'pulseSubtle 3s ease-in-out infinite',
        'shimmer':        'shimmer 2s linear infinite',
        'gradient-x':     'gradientX 6s ease infinite',
        'spin-slow':      'spin 8s linear infinite',
      },

      keyframes: {
        fadeIn:       { '0%':{ opacity:'0' },                               '100%':{ opacity:'1' } },
        fadeInUp:     { '0%':{ opacity:'0',transform:'translateY(20px)' },   '100%':{ opacity:'1',transform:'translateY(0)' } },
        fadeInDown:   { '0%':{ opacity:'0',transform:'translateY(-20px)' },  '100%':{ opacity:'1',transform:'translateY(0)' } },
        slideUp:      { '0%':{ opacity:'0',transform:'translateY(30px)' },   '100%':{ opacity:'1',transform:'translateY(0)' } },
        slideDown:    { '0%':{ opacity:'0',transform:'translateY(-30px)' },  '100%':{ opacity:'1',transform:'translateY(0)' } },
        slideInRight: { '0%':{ opacity:'0',transform:'translateX(30px)' },   '100%':{ opacity:'1',transform:'translateX(0)' } },
        slideInLeft:  { '0%':{ opacity:'0',transform:'translateX(-30px)' },  '100%':{ opacity:'1',transform:'translateX(0)' } },
        scaleIn:      { '0%':{ opacity:'0',transform:'scale(0.9)' },        '100%':{ opacity:'1',transform:'scale(1)' } },
        bounceIn:     { '0%':{ opacity:'0',transform:'scale(0.3)' }, '50%':{ opacity:'1',transform:'scale(1.05)' }, '70%':{ transform:'scale(0.9)' }, '100%':{ opacity:'1',transform:'scale(1)' } },
        float:        { '0%,100%':{ transform:'translateY(0)' },            '50%':{ transform:'translateY(-20px)' } },
        pulseSubtle:  { '0%,100%':{ opacity:'1' },                          '50%':{ opacity:'0.7' } },
        shimmer:      { '0%':{ backgroundPosition:'-200% 0' },              '100%':{ backgroundPosition:'200% 0' } },
        gradientX:    { '0%,100%':{ backgroundPosition:'0% 50%' },          '50%':{ backgroundPosition:'100% 50%' } },
      },

      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16,1,0.3,1)',
        'bounce':   'cubic-bezier(0.175,0.885,0.32,1.275)',
      },
    },
  },
  plugins: [],
}
