/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'visit': '#3b82f6', // blue-500
        'funding': '#10b981', // emerald-500
        'mediation': '#8b5cf6', // violet-500
        'multilateral': '#f59e0b', // amber-500
        'statement': '#64748b', // slate-500
      }
    },
  },
  plugins: [],
}
