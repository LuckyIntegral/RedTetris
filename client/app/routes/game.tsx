import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { GamePage } from '../components/game/GamePage';
import type { Route } from './+types/game';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Red Tetris — Play' },
    { name: 'description', content: 'Play Red Tetris - The Ultimate Multiplayer Tetris Experience!' },
  ];
}

export default function GameRoute() {
  return (
    <ProtectedRoute>
      <GamePage />
    </ProtectedRoute>
  );
}

