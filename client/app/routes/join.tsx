import { useParams } from 'react-router';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { GamePage } from '../components/game/GamePage';

/**
 * Handles the subject-required URL format: /:room/:playerName
 * Renders the game page directly and auto-joins the room.
 */
export default function JoinRoute() {
  const { room } = useParams<{ room: string; playerName: string }>();
  return (
    <ProtectedRoute>
      <GamePage initialRoom={room} />
    </ProtectedRoute>
  );
}
