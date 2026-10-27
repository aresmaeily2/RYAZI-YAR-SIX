/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' باعث می‌شود خروجی Build با مسیرهای نسبی ساخته شود و
// روی GitHub Pages (زیرمسیر مخزن) یا هر هاست دیگری بدون تغییر کار کند.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    css: false,
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
});
