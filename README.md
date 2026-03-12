*This project has been created as part of the 42 curriculum by vfrants, tkafanov.*

## Description

Red Tetris is a full-stack, real-time multiplayer implementation of the classic Tetris game.
It is built as a modern web application with a React Router client, an Express/Socket.IO
API server, and a MySQL database. Players can register, log in, create or join games, and
play simultaneously in the same room while the server enforces the game rules.

Main technologies:
- Client: React 19, React Router, TypeScript, Vite, Tailwind CSS, Redux Toolkit
- Server: Node.js, Express, Socket.IO, TypeScript
- Database: MySQL with SQL migration files and a simple migration runner
- Tooling & Quality: ESLint, Prettier, Vitest (client), Mocha + NYC (server), Sentry for monitoring

### Gameplay

- Each game is hosted in a room with one or more players, all playing at the same time
	on their own board.
- The rules follow the classic falling-block Tetris: tetrominoes spawn at the top, you
	move and rotate them to complete horizontal lines, which are then cleared.
- The server runs the game engine and keeps the state authoritative for all players:
	piece generation, gravity, line clears, score, KO detection and the overall game status
	(waiting, running, finished).
- Multiple line clears at once not only increase your score but also send garbage lines
	to opponents, making their boards harder to manage.
- The engine supports several game modes with different board sizes and piece sets:
	- `Classic` – 10×20 board with the 7 classic tetrominoes.
	- `Narrow` – 6×22 board, classic pieces but less horizontal space.
	- `Pentominoes` – 12×22 board using five-cell pentomino pieces.
	- `Cyber` – 8×18 board with custom “cyber” shapes.

## Instructions

### Prerequisites

- Node.js and pnpm installed (the repository is configured as a pnpm workspace)
- A running MySQL instance with access credentials

### 1. Clone the repository

```bash
git clone <your-repo-url> red-tetris
cd red-tetris
```

### 2. Environment configuration

The root of the project contains an example environment file:

```bash
cp .env.example .env
```

Key variables (see `.env.example` for full list):
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` – main MySQL database
- `DB_PASSWORD_TEST`, `DB_NAME_TEST` – test database
- `CLIENT_URL`, `CLIENT_PORT` – allowed frontend origins and client dev port
- `SERVER_PORT` – HTTP/Socket.IO server port (defaults to 3002)
- `JWT_SECRET`, `JWT_EXPIRES_IN` – JWT authentication settings

Make sure the configured MySQL user and databases exist (for example `red_tetris` and
`red_tetris_test`). The server will apply all SQL migrations from `server/migrations` on
startup.

### 3. Install dependencies

At the repository root:

```bash
pnpm install
```

This installs dependencies for both `client` and `server` workspaces.

### 4. Run in development mode

From the repository root:

```bash
pnpm run dev
```

This starts, in parallel:
- The API + WebSocket server (Express + Socket.IO, default on port 3002)
- The React Router client dev server (default on port 3001)

You can then open the client in your browser, e.g.:

```text
http://localhost:3001
```

The server also exposes:
- `GET /` – simple welcome message ("Welcome to Red Tetris API")
- `GET /health` – health check including database status
- `GET /api-docs` – Swagger UI with API documentation

### 5. Build for production

To create a production build of both client and server:

```bash
pnpm run build
```

This will produce:
- Client bundle under `client/build`
- Server JavaScript under `server/dist`

To start both in a production-like mode:

```bash
pnpm run start
```

### 6. Linting, formatting and tests

Run linters and formatters across client and server:

```bash
pnpm run lint        # fix
pnpm run lint:check  # check only
pnpm run prettier
pnpm run prettier:check
```

Run all tests:

```bash
pnpm test
```

Run coverage:

```bash
pnpm coverage
```

You can also run commands per workspace (from the repo root):

```bash
pnpm --filter=client test
pnpm --filter=server test
```

## Features

- User authentication with JWT (register, login) and protected routes
- REST API for authentication and game management (create/join/list games)
- Real-time gameplay using Socket.IO between clients and server
- Game rooms managed by a `GameManager` keeping track of active games
- Tetris game engine on the server (piece generation, game loop, scoring rules)
- React Router front-end with routes for home, login, register, and game screen
- Global state management on the client using Redux Toolkit
- Error and performance monitoring on the client using Sentry (via @sentry/react and @sentry/vite-plugin)
- Automatic database migrations on server startup (MySQL + SQL files)
- Swagger-based API documentation available at `/api-docs`
- Test suites for both client and server, plus coverage reporting

## Usage Overview

1. Start the application in development mode (`pnpm run dev`).
2. Open the client URL in your browser.
3. Register a new account and log in.
4. Create a new game (or join an existing one) from the UI.
5. Play Tetris in real time; the server manages game state, pieces, and scoring
	 for each room while broadcasting updates via WebSockets.

Exact UI flows (available screens, buttons, etc.) are defined in the client under
`client/app/routes` and related components.

## Resources

### Technical documentation and references

- Tetris Guidelines / Rules:
	- https://tetris.fandom.com/wiki/Tetris_Guideline
- React & React Router:
	- https://react.dev/
	- https://reactrouter.com/
- Redux Toolkit:
	- https://redux-toolkit.js.org/
- Socket.IO (real-time communication):
	- https://socket.io/docs/v4/
- Express (API server):
	- https://expressjs.com/
- MySQL:
	- https://dev.mysql.com/doc/
- JSON Web Tokens (JWT):
	- https://jwt.io/introduction
 - Sentry (error & performance monitoring):
	 - https://docs.sentry.io/platforms/javascript/guides/react/

### Use of AI in this project

- GitHub Copilot (GPT-5.1) was used to assist with:
	- Drafting and structuring this README file.
	- Suggesting small refactorings, tests, and utility code during development.
	- Providing quick feedback and alternatives for TypeScript, React, Express,
		Socket.IO, and SQL patterns.
- Claude Opus 4.6 was also used by teammate `tkafanov`
	for higher-level design discussion, alternative implementation ideas, and
	additional wording suggestions.
- All generated suggestions from both tools were reviewed, adapted, and validated
	by the authors (vfrants, tkafanov), who remain responsible for the design,
	logic, and final implementation of the project.
