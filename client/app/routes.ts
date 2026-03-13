import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  route('.well-known/appspecific/com.chrome.devtools.json', 'routes/chrome-devtools.tsx'),
  index('routes/home.tsx'),
  route('login', 'routes/login.tsx'),
  route('register', 'routes/register.tsx'),
  route('game', 'routes/game.tsx'),
  route(':room/:playerName', 'routes/join.tsx'),
] satisfies RouteConfig;
