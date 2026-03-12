import { useParams } from 'react-router';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { GamePage } from '../components/game/GamePage';

export default function JoinRoute() {
  const { room } = useParams<{ room: string; playerName: string }>();
  return (
    <ProtectedRoute>
      <GamePage initialRoom={room} />
    </ProtectedRoute>
  );
}
