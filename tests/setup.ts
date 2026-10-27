import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// پاک‌سازی DOM بعد از هر تست کامپوننتی
afterEach(() => {
  cleanup();
  localStorage.clear();
});
