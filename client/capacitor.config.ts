import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.andullah.chatapp',
  appName: 'ChatApp',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
