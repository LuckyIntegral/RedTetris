import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tetris PWA Application',
    short_name: 'Tetris',
    description: 'A Progressive Web Application for Tetris',
    start_url: '/',
    display: 'standalone',
    background_color: '#1e2939',
    theme_color: '#1e2939',
    icons: [
      // TODO: generate icons
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
