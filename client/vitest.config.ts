import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,tsx}'],
      exclude: [
        'app/root.tsx',
        'app/routes.ts',
        'app/+types/**',
        'app/routes/+types/**',
        'app/app.css',
        'app/types/**',
      ],
      thresholds: { statements: 70, functions: 70, lines: 70, branches: 50 },
    },
  },
  define: { 'import.meta.env.VITE_SERVER_URL': JSON.stringify('http://localhost:3002') },
});
