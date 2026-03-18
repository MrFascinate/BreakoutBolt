import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.outruntheops.game',
  appName: 'Outrun The Ops',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    ScreenOrientation: {
      orientation: 'portrait',
    },
  },
};

export default config;
