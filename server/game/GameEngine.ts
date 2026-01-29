import { GameState, Intent, Piece } from './types';

const WIDTH = 10;
const HEIGHT = 20;

const TETROMINOS: Record<string, number[][][]> = {
  I: [[[1, 1, 1, 1]], [[1], [1], [1], [1]]],
  O: [
    [
      [1, 1],
      [1, 1],
    ],
  ],
  T: [
    [
      [0, 1, 0],
      [1, 1, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 0],
    ],
    [
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 1],
      [1, 1],
      [0, 1],
    ],
  ],
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  ],
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
    ],
    [
      [1, 1],
      [1, 0],
      [1, 0],
    ],
    [
      [1, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
  ],
  L: [
    [
      [0, 0, 1],
      [1, 1, 1],
    ],
    [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    [
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1],
      [0, 1],
      [0, 1],
    ],
  ],
};

const PIECE_TYPES = Object.keys(TETROMINOS);

function createEmptyBoard(): number[][] {
  return Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => 0));
}

function cloneBoard(board: number[][]) {
  return board.map((row) => row.slice());
}

function hashStringToSeed(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class GameEngine {
  seed: string;
  rng: () => number;

  constructor(seed = 'default') {
    this.seed = seed;
    const h = hashStringToSeed(seed);
    this.rng = mulberry32(h);
  }

  private drawBag() {
    const bag = PIECE_TYPES.slice();
    // Fisher-Yates shuffle with seeded rng
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  private ensureQueue(queue: string[], min = 20) {
    while (queue.length < min) {
      queue.push(...this.drawBag());
    }
  }

  private cloneState<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }

  createInitialState(playerIds: string[]): GameState {
    const sharedQueue: string[] = [];
    this.ensureQueue(sharedQueue, 50);

    const players = Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          board: createEmptyBoard(),
          activePiece: null,
          nextQueue: sharedQueue.slice(0, 5),
          isAlive: true,
          spectrum: Array.from({ length: WIDTH }, () => 0),
        },
      ])
    );

    return { status: 'waiting', tick: 0, sharedQueue, sharedIndex: 0, players } as GameState;
  }

  addPlayer(state: GameState, playerId: string): GameState {
    const newState: GameState = this.cloneState(state);
    newState.players[playerId] = {
      board: createEmptyBoard(),
      activePiece: null,
      nextQueue: newState.sharedQueue.slice(newState.sharedIndex, newState.sharedIndex + 5),
      isAlive: true,
      spectrum: Array.from({ length: WIDTH }, () => 0),
    };
    return newState;
  }

  private getPieceMatrix(type: string, rotation: number) {
    const rots = TETROMINOS[type];
    return rots[rotation % rots.length];
  }

  private collides(board: number[][], piece: Piece) {
    if (!piece) return true;
    const mat = this.getPieceMatrix(piece.type, piece.rotation);
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (!mat[r][c]) continue;
        const x = piece.x + c;
        const y = piece.y + r;
        if (x < 0 || x >= WIDTH || y >= HEIGHT) return true;
        if (y >= 0 && board[y][x]) return true;
      }
    }
    return false;
  }

  private placePiece(board: number[][], piece: Piece) {
    const newBoard = cloneBoard(board);
    const mat = this.getPieceMatrix(piece.type, piece.rotation);
    const id = PIECE_TYPES.indexOf(piece.type) + 1;
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (!mat[r][c]) continue;
        const x = piece.x + c;
        const y = piece.y + r;
        if (y >= 0 && y < HEIGHT && x >= 0 && x < WIDTH) newBoard[y][x] = id;
      }
    }
    return newBoard;
  }

  // Render a board with an active piece merged in. Piece cells are
  // encoded as numeric IDs 1..N based on the piece type index in PIECE_TYPES.
  public renderBoardWithPiece(board: number[][], piece: Piece | null) {
    const newBoard = cloneBoard(board);
    if (!piece) return newBoard;
    const mat = this.getPieceMatrix(piece.type, piece.rotation);
    const id = PIECE_TYPES.indexOf(piece.type) + 1;
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (!mat[r][c]) continue;
        const x = piece.x + c;
        const y = piece.y + r;
        if (y >= 0 && y < HEIGHT && x >= 0 && x < WIDTH) newBoard[y][x] = id;
      }
    }
    return newBoard;
  }

  private clearLines(board: number[][]) {
    const newBoard = board.filter((row) => row.some((cell) => cell === 0));
    const cleared = HEIGHT - newBoard.length;
    while (newBoard.length < HEIGHT) newBoard.unshift(Array.from({ length: WIDTH }, () => 0));
    return { board: newBoard, cleared };
  }

  private computeSpectrum(board: number[][]) {
    const spectrum = Array.from({ length: WIDTH }, () => 0);
    for (let x = 0; x < WIDTH; x++) {
      for (let y = 0; y < HEIGHT; y++) {
        if (board[y][x]) {
          spectrum[x] = HEIGHT - y;
          break;
        }
      }
    }
    return spectrum;
  }

  applyInput(state: GameState, playerId: string, input: Intent): GameState {
    const newState: GameState = this.cloneState(state);
    const player = newState.players[playerId];
    if (!player?.isAlive) return newState;

    let active: Piece | null = player.activePiece;
    if (!active) return newState;

    const cur = active;
    const tryMove = (dx: number, dy: number, drot = 0) => {
      const candidate: Piece = { type: cur.type, x: cur.x + dx, y: cur.y + dy, rotation: cur.rotation + drot };
      if (!this.collides(player.board, candidate)) {
        player.activePiece = candidate;
      }
    };

    switch (input?.type) {
      case 'move':
        if (input.dir === 'left') tryMove(-1, 0);
        if (input.dir === 'right') tryMove(1, 0);
        break;
      case 'rotate':
        tryMove(0, 0, 1);
        break;
      case 'soft':
        tryMove(0, 1);
        break;
      case 'hard':
        // drop until collision
        while (active) {
          const cand: Piece = { ...active, y: active.y + 1 };
          if (this.collides(player.board, cand)) break;
          active = cand;
        }
        player.activePiece = active;
        // lock immediately
        player.board = this.placePiece(player.board, player.activePiece);
        player.activePiece = null;
        break;
      default:
        break;
    }

    return newState;
  }

  tick(state: GameState): GameState {
    const newState: GameState = this.cloneState(state);
    newState.tick += 1;

    // Ensure shared queue
    this.ensureQueue(newState.sharedQueue, 20);

    for (const playerId of Object.keys(newState.players)) {
      const p = newState.players[playerId];
      if (!p.isAlive) continue;

      // spawn piece if none
      if (!p.activePiece) {
        // assign the next piece from shared queue using sharedIndex so all players get the same order
        const next = newState.sharedQueue[newState.sharedIndex];
        // ensure there are at least 20 pieces after the current index
        this.ensureQueue(newState.sharedQueue, Math.max(20, newState.sharedIndex + 5));
        if (!next) {
          p.isAlive = false;
          continue;
        }
        const piece: Piece = { type: next, x: Math.floor(WIDTH / 2) - 1, y: -2, rotation: 0 };
        // advance shared index by 1 so next spawn uses the following piece
        newState.sharedIndex = (newState.sharedIndex || 0) + 1;
        p.activePiece = piece;
        p.nextQueue = newState.sharedQueue.slice(newState.sharedIndex, newState.sharedIndex + 5);
        // immediate collision -> player loses
        if (this.collides(p.board, piece)) {
          p.isAlive = false;
          continue;
        }
      }

      // gravity step: attempt to move down
      const moved: Piece = { ...p.activePiece, y: p.activePiece.y + 1 };
      if (!this.collides(p.board, moved)) {
        p.activePiece = moved;
      } else {
        // lock piece
        p.board = this.placePiece(p.board, p.activePiece);
        p.activePiece = null;
        // clear lines
        const { board: clearedBoard, cleared } = this.clearLines(p.board);
        p.board = clearedBoard;
        if (cleared > 0) {
          // send garbage to others: n-1 rows
          const garbageLines = Math.max(0, cleared - 1);
          if (garbageLines > 0) {
            for (const otherId of Object.keys(newState.players)) {
              if (otherId === playerId) continue;
              const other = newState.players[otherId];
              if (!other.isAlive) continue;
              // add garbage at bottom
              for (let g = 0; g < garbageLines; g++) {
                other.board.shift();
                other.board.push(Array.from({ length: WIDTH }, () => PIECE_TYPES.length));
              }
            }
          }
        }
      }

      // recompute spectrum
      p.spectrum = this.computeSpectrum(p.board);
    }

    // check KO: if only one or zero players alive and game was running, finish
    const alive = Object.values(newState.players).filter((p) => p.isAlive).length;
    if (newState.status === 'running' && alive <= 1) newState.status = 'finished';

    return newState;
  }
}
