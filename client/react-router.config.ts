import type { Config } from '@react-router/dev/config';

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  server: {
    /**
     * Apply security headers to all HTTP responses to match the previous Next.js setup.
     */
    async onRequest(request, next) {
      const response = await next();

      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('Referrer-Policy', 'same-origin');

      return response;
    },
  },
} satisfies Config;
