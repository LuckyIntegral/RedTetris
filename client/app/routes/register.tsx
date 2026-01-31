import type { Route } from './+types/register';
import { RegisterForm } from '../components/auth/RegisterForm';
import { PublicOnlyRoute } from '../components/auth/PublicOnlyRoute';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Register - Red Tetris' }, { name: 'description', content: 'Create a Red Tetris account' }];
}

export default function Register() {
  return (
    <PublicOnlyRoute>
      <RegisterForm />
    </PublicOnlyRoute>
  );
}
