import type { Route } from './+types/login';
import { LoginForm } from '../components/auth/LoginForm';
import { PublicOnlyRoute } from '../components/auth/PublicOnlyRoute';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Login - Red Tetris' }, { name: 'description', content: 'Login to Red Tetris' }];
}

export default function Login() {
  return (
    <PublicOnlyRoute>
      <LoginForm />
    </PublicOnlyRoute>
  );
}
