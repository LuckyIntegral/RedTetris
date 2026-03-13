import { reactRouter } from '@react-router/dev/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// Dynamic server URL based on environment
const serverPort = process.env.SERVER_PORT ?? '3002';
const clientPort = parseInt(process.env.CLIENT_PORT ?? '3001', 10);
const serverUrl =
  process.env.VITE_SERVER_URL === 'auto'
    ? `http://localhost:${serverPort}`
    : "http://10.18.182.225:3002";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    sentryVitePlugin({ org: '42vienna', project: 'red-tetris' }),
  ],

  envDir: '..',

  server: { host: '0.0.0.0', port: clientPort },

  define: { 'import.meta.env.VITE_SERVER_URL': JSON.stringify(serverUrl) },

  build: { sourcemap: true },
});
