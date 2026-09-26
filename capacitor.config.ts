import type { CapacitorConfig } from '@capacitor/cli';

// appId must be unique on Google Play — it can't be changed after the first upload.
const config: CapacitorConfig = {
  appId: 'pl.jasior.catescape',
  appName: 'Cat Escape',
  webDir: 'dist',
  android: { backgroundColor: '#f6e7d4' },
};

export default config;
