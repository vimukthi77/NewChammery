import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chammery: {
          cream: '#FFF8F0',
          peach: '#FFDAB9',
          orange: '#E67E22',
          brown: '#8B4513',
          dark: '#1A1A2E',
          light: '#F5E6D3',
          success: '#27AE60',
          danger: '#E74C3C',
          warning: '#F39C12',
          info: '#3498DB',
        },
      },
      borderRadius: {
        '3xl': '24px',
        '2xl': '18px',
        'xl': '14px',
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.05)',
        'card': '0 10px 25px -5px rgba(230, 126, 34, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        'floating': '0 20px 35px rgba(26, 26, 46, 0.25)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;

