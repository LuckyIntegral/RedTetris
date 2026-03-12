import { reactRouter } from '@react-router/dev/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import os from 'os';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// Helper function to get the first network IP
function getNetworkIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const networkInterface of interfaces[name]) {
      if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
        return networkInterface.address;
      }
    }
  }
  return 'localhost';
}

// Dynamic server URL based on environment
const serverPort = process.env.SERVER_PORT ?? '3002';
const clientPort = parseInt(process.env.CLIENT_PORT ?? '3001', 10);
const serverUrl =
  process.env.VITE_SERVER_URL === 'auto'
    ? `http://${getNetworkIP()}:${serverPort}`
    : (process.env.VITE_SERVER_URL ?? `http://localhost:${serverPort}`);

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    sentryVitePlugin({ org: '42vienna', project: 'red-tetris' }),
  ],

  envDir: '..',

  server: {
    host: '0.0.0.0', // Allow external connections
    port: clientPort,
  },

  define: { 'import.meta.env.VITE_SERVER_URL': JSON.stringify(serverUrl) },

  build: { sourcemap: true },
});
