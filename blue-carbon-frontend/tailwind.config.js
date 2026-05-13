/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50:  '#e0f7f4',
          100: '#b2ece4',
          200: '#7dddd2',
          300: '#45cdbf',
          400: '#00bfae',
          500: '#00b09e',
          600: '#009e8d',
          700: '#008778',
          800: '#007264',
          900: '#004d44',
        },
        carbon: {
          50:  '#e8eaf0',
          100: '#c5c9d8',
          200: '#9fa5be',
          300: '#7882a4',
          400: '#5a6690',
          500: '#3d4a7a',
          600: '#374271',
          700: '#2e3865',
          800: '#252e58',
          900: '#151e42',
        },
        dark: {
          50:  '#8892a4',
          100: '#64748b',
          200: '#475569',
          300: '#334155',
          400: '#1e293b',
          500: '#0f172a',
          600: '#0a1020',
          700: '#070c18',
          800: '#040810',
          900: '#020408',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0,191,174,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0,191,174,0.6)' },
        }
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0,191,174,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,191,174,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      }
    },
  },
  plugins: [],
}
