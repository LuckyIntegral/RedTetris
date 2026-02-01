import { GameState, Intent, Piece, PlayerState } from './types';

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
    // TODO: delete with refactoring
    while (queue.length < min) {
      queue.push(...this.drawBag());
    }
  }

  private cloneState<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }

  createInitialState(playerIds: string[]): GameState {
    const sharedQueue: string[] = []; // TODO: no queue model later
    this.ensureQueue(sharedQueue, 50);

    const playerStates: Record<string, PlayerState> = Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          board: createEmptyBoard(),
          activePiece: null,
          nextQueue: sharedQueue.slice(0, 5), // TODO: no queue model later
          isAlive: true,
          spectrum: Array.from({ length: WIDTH }, () => 0),
          name: '',
        },
      ])
    );

    return { status: 'waiting', tick: 0, sharedQueue, sharedIndex: 0, playerStates } as GameState;
  }

  addPlayer(state: GameState, playerId: string): GameState {
    const newState: GameState = this.cloneState(state);
    newState.playerStates[playerId] = {
      board: createEmptyBoard(),
      activePiece: null,
      nextQueue: newState.sharedQueue.slice(newState.sharedIndex, newState.sharedIndex + 5),
      isAlive: true,
      spectrum: Array.from({ length: WIDTH }, () => 0),
      name: '',
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

    if (!piece) {
      return newBoard;
    }
    const mat = this.getPieceMatrix(piece.type, piece.rotation);
    const id = PIECE_TYPES.indexOf(piece.type) + 1;
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (!mat[r][c]) {
          continue;
        }
        const x = piece.x + c;
        const y = piece.y + r;
        if (y >= 0 && y < HEIGHT && x >= 0 && x < WIDTH) {
          newBoard[y][x] = id; // TODO: switch to color
        }
      }
    }
    return newBoard;
  }

  private clearLines(board: number[][]) {
    const newBoard = board.filter((row) => row.some((cell) => cell === 0));
    const cleared = HEIGHT - newBoard.length;
    while (newBoard.length < HEIGHT) {
      newBoard.unshift(Array.from({ length: WIDTH }, () => 0));
    }
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
    const player = newState.playerStates[playerId];
    if (!player?.isAlive) {
      return newState;
    }

    const active: Piece | null = player.activePiece;
    if (!active) {
      return newState;
    }

    const cur = active;
    const tryMove = (dx: number, dy: number, drot = 0): boolean => {
      const candidate: Piece = { type: cur.type, x: cur.x + dx, y: cur.y + dy, rotation: cur.rotation + drot };
      if (!this.collides(player.board, candidate)) {
        player.activePiece = candidate;
        return true;
      }
      return false;
    };

    if (input.type === 'move') {
      if (input.dir === 'left') {
        tryMove(-1, 0);
      } else if (input.dir === 'right') {
        tryMove(1, 0);
      }
    } else if (input.type === 'rotate') {
      tryMove(0, 0, 1);
    } else if (input.type === 'soft') {
      tryMove(0, 1);
    } else if (input.type === 'hard') {
      // TODO: add levitation effect here
      while (tryMove(0, 1)) {}
      player.board = this.placePiece(player.board, player.activePiece!);
      player.activePiece = null;
    }

    return newState;
  }

  tick(state: GameState): GameState {
    const newState: GameState = this.cloneState(state);
    newState.tick += 1;

    // Ensure shared queue
    // TODO: go to no queue model later
    this.ensureQueue(newState.sharedQueue, 20);

    for (const [playerId, playerState] of Object.entries(newState.playerStates)) {
      // spawn piece if none
      if (!playerState.activePiece) {
        // assign the next piece from shared queue using sharedIndex so all players get the same order
        // TODO: no queue model later
        const next = newState.sharedQueue[newState.sharedIndex];
        // ensure there are at least 20 pieces after the current index
        this.ensureQueue(newState.sharedQueue, Math.max(20, newState.sharedIndex + 5));
        if (!next) {
          playerState.isAlive = false;
          continue;
        }
        const piece: Piece = { type: next, x: Math.floor(WIDTH / 2) - 1, y: -2, rotation: 0 };
        // advance shared index by 1 so next spawn uses the following piece
        newState.sharedIndex = (newState.sharedIndex || 0) + 1;
        playerState.activePiece = piece;
        playerState.nextQueue = newState.sharedQueue.slice(newState.sharedIndex, newState.sharedIndex + 5);
        // immediate collision -> player loses
        if (this.collides(playerState.board, piece)) {
          playerState.isAlive = false;
          continue;
        }
      }

      // gravity step: attempt to move down
      const moved: Piece = { ...playerState.activePiece, y: playerState.activePiece.y + 1 };
      if (!this.collides(playerState.board, moved)) {
        playerState.activePiece = moved;
      } else {
        // lock piece
        playerState.board = this.placePiece(playerState.board, playerState.activePiece);
        playerState.activePiece = null;
        // clear lines
        const { board: clearedBoard, cleared } = this.clearLines(playerState.board);
        playerState.board = clearedBoard;
        if (cleared > 1) {
          const generatedLine = Array.from({ length: WIDTH }, () => 0);
          generatedLine[Math.floor(this.rng() * WIDTH)] = 0;

          for (const otherId of Object.keys(newState.playerStates)) {
            if (otherId === playerId) {
              continue;
            }
            const other = newState.playerStates[otherId];
            if (!other.isAlive) {
              continue;
            }

            for (let g = 0; g < cleared - 1; g++) {
              other.board.shift();
              for (let x = 0; x < WIDTH; x++) {
                other.board.push(generatedLine);
              }
            }
          }
        }
      }

      // recompute spectrum
      playerState.spectrum = this.computeSpectrum(playerState.board);
    }

    // check KO: if only one or zero players alive and game was running, finish
    const alive = Object.values(newState.playerStates).filter((p) => p.isAlive).length;
    if (newState.status === 'running' && alive <= 1) {
      newState.status = 'finished';
    }

    return newState;
  }
}
