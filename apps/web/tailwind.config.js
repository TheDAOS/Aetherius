/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          shell: '#F6F3EA',
          card: '#FDFCFA',
          muted: '#ECE7D8',
          border: '#D8D1C0',
        },
        paper: {
          canvas: '#FFFFFF',
          ruled: '#F2EFE9',
        },
        ink: {
          primary: '#111111',
          secondary: '#383531',
          muted: '#66625C',
          faint: '#A59E92',
        },
        accent: {
          acid: '#E2FF00',
          orange: '#FF5500',
          pink: '#FF1493',
          cobalt: '#1848FF',
          mint: '#00F5D4',
        }
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px #111111',
        'neo': '3px 3px 0px #111111',
        'neo-lg': '5px 5px 0px #111111',
        'neo-xl': '8px 8px 0px #111111',
        'neo-pressed': '1px 1px 0px #111111',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"Space Mono"', '"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
