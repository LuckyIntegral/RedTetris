import * as Sentry from '@sentry/react';
import { Provider } from 'react-redux';
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useNavigation } from 'react-router';

import type { Route } from './+types/routes';
import './app.css';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';
import { store } from './store/store';

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
    >
      <head>
        <meta charSet='utf-8' />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1'
        />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const navigation = useNavigation();
  const isNavigating = navigation.state === 'loading';
  const { theme, toggle, isHydrated } = useTheme();

  return (
    <Provider store={store}>
      {isHydrated && (
        <ThemeToggle
          theme={theme}
          toggle={toggle}
        />
      )}
      <Outlet />
      {isNavigating && <LoadingOverlay />}
    </Provider>
  );
}

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string;
if (SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN, sendDefaultPii: true });
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details = error.status === 404 ? 'The requested page could not be found.' : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className='min-h-screen bg-page flex items-center justify-center p-6'>
      <div className='text-center max-w-md'>
        <h1 className='text-8xl font-bold text-red-500 mb-4'>{message}</h1>
        <p className='text-xl text-on-surface-variant mb-8'>{details}</p>
        {stack && (
          <pre className='w-full p-4 overflow-x-auto bg-surface-alt border border-outline rounded-lg text-left text-sm text-on-surface-muted mb-8'>
            <code>{stack}</code>
          </pre>
        )}
        <a
          href='/'
          className='inline-block px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors'
        >
          Back to Home
        </a>
      </div>
    </main>
  );
}
