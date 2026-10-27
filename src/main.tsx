import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ثبت Service Worker فقط در نسخه تولیدی برای کارکرد آفلاین
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // اگر ثبت سرویس‌ورکر ممکن نشد، برنامه همچنان به‌صورت آنلاین کار می‌کند
    });
  });
}
