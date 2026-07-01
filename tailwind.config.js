/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Nunito', 'system-ui', 'sans-serif'],
        display: ['Nunito', '"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        /** Scale đọc thoải mái cho màn Chuyên đề ôn thi */
        'ontap-xs': ['0.8125rem', { lineHeight: '1.45' }],
        'ontap-sm': ['0.9375rem', { lineHeight: '1.5' }],
        'ontap-base': ['1.0625rem', { lineHeight: '1.6' }],
        'ontap-lg': ['1.1875rem', { lineHeight: '1.55' }],
        'ontap-xl': ['1.375rem', { lineHeight: '1.35' }],
        'ontap-2xl': ['1.625rem', { lineHeight: '1.3' }],
        'ontap-3xl': ['2rem', { lineHeight: '1.25' }],
      },
    },
  },
  plugins: [],
};
