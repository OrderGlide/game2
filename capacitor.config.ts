import type { CapacitorConfig } from '@capacitor/cli';

// appId must be unique on Google Play — it can't be changed after the first upload.
const config: CapacitorConfig = {
  appId: 'pl.jasior.room100',
  appName: 'Room 100',
  webDir: 'dist',
  android: { backgroundColor: '#0b0807' },
};

export default config;
