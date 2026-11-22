import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mathmvp.riaziyarsix',
  appName: 'ریاضی‌یار ششم',
  webDir: 'dist',
  server: {
    // Pin the WebView origin to https://localhost so ES modules always work;
    // never let the bridge fall back to a file:// origin.
    androidScheme: 'https'
  }
};

export default config;
