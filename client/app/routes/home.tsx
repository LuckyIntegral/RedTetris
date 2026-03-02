import type { Route } from './+types/home';
import { Welcome } from '../welcome/welcome';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Red Tetris - Home' },
    { name: 'description', content: 'Play Red Tetris - The Ultimate Multiplayer Tetris Experience!' },
  ];
}

export default function Home() {
  return (
    <ProtectedRoute>
      <Welcome />
    </ProtectedRoute>
  );
}
