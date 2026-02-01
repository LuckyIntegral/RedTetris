import { logger } from '../utils/logger';
import { PieceGenerator } from './PieceGenerator';
import { GameState, Intent, Piece, PlayerState } from './types';

const WIDTH = 10;
const HEIGHT = 20;

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

export class GameEngine {
  seed: string;
  private pieceGenerator: PieceGenerator;

  constructor(seed = 'default') {
    this.seed = seed;
    const h = hashStringToSeed(seed);

    this.pieceGenerator = new PieceGenerator(h);
  }

  private cloneState<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }

  createInitialState(playerIds: string[]): GameState {
    const playerStates: Record<string, PlayerState> = Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          board: createEmptyBoard(),
          activePiece: null,
          nextPiece: null,
          piecesPlaced: 0,
          isAlive: true,
          spectrum: Array.from({ length: WIDTH }, () => 0),
          name: '',
        },
      ])
    );

    return { status: 'waiting', tick: 0, playerStates } as GameState;
  }

  addPlayer(state: GameState, playerId: string): GameState {
    const newState: GameState = this.cloneState(state);
    newState.playerStates[playerId] = {
      board: createEmptyBoard(),
      activePiece: null,
      nextPiece: null,
      piecesPlaced: 0,
      isAlive: true,
      spectrum: Array.from({ length: WIDTH }, () => 0),
      name: '',
    };
    return newState;
  }

  private collides(board: number[][], piece: Piece) {
    if (!piece) {
      return true;
    }
    const { piece: mat } = this.pieceGenerator.getPieceShapeAndColor(piece.type, piece.rotation);

    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (!mat[r][c]) {
          continue;
        }
        const x = piece.x + c;
        const y = piece.y + r;
        if (x < 0 || x >= WIDTH || y >= HEIGHT) {
          return true;
        }
        if (y >= 0 && board[y][x]) {
          return true;
        }
      }
    }
    return false;
  }

  // Render a board with an active piece merged in. Piece cells are
  // encoded as numeric IDs 1..N based on the piece type index in PIECE_TYPES.
  public renderBoardWithPiece(board: number[][], piece: Piece | null) {
    const newBoard = cloneBoard(board);

    if (!piece) {
      return newBoard;
    }

    const { piece: mat, color } = this.pieceGenerator.getPieceShapeAndColor(piece.type, piece.rotation);

    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (!mat[r][c]) {
          continue;
        }
        const x = piece.x + c;
        const y = piece.y + r;
        if (y >= 0 && y < HEIGHT && x >= 0 && x < WIDTH) {
          newBoard[y][x] = color;
        }
      }
    }
    return newBoard;
  }

  private clearLines(board: number[][]) {
    const newBoard: number[][] = [];
    let cleared = 0;

    for (const row of board) {
      if (!row.every((cell) => cell !== 0)) {
        newBoard.push(row);
        continue;
      }

      if (!row.some((cell) => cell === -1)) {
        cleared += 1;
      }

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
      // use the current active piece as the base so repeated moves (eg. hard drop)
      // advance from the most-recent position instead of a stale snapshot
      const base = player.activePiece ?? cur;
      const candidate: Piece = { type: base.type, x: base.x + dx, y: base.y + dy, rotation: base.rotation + drot };
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
      while (tryMove(0, 1));

      player.board = this.renderBoardWithPiece(player.board, player.activePiece);
      player.activePiece = null;

      this.computeLinesClearedReward(newState, playerId);
    }

    return newState;
  }

  private computeLinesClearedReward(state: GameState, playerId: string) {
    const { board: clearedBoard, cleared } = this.clearLines(state.playerStates[playerId].board);
    state.playerStates[playerId].board = clearedBoard;

    if (cleared > 1) {
      const generatedLine = Array.from({ length: WIDTH }, () => -1);
      generatedLine[Math.floor(Math.random() * WIDTH)] = 0;

      const garbageLines = Math.max(0, cleared - 1);
      if (garbageLines > 0) {
        for (const otherId of Object.keys(state.playerStates)) {
          if (otherId === playerId) {
            continue;
          }
          const other = state.playerStates[otherId];
          if (!other.isAlive) {
            continue;
          }
          for (let g = 0; g < garbageLines; g++) {
            other.board.shift();
            other.board.push(generatedLine.slice());
          }
        }
      }
    }
  }

  tick(state: GameState): GameState {
    const newState: GameState = this.cloneState(state);
    newState.tick += 1;

    for (const [playerId, playerState] of Object.entries(newState.playerStates)) {
      if (!playerState.activePiece) {
        if (!playerState.nextPiece) {
          playerState.nextPiece = this.pieceGenerator.getPiece(playerState.piecesPlaced);
          playerState.piecesPlaced += 1;
        }

        const next = playerState.nextPiece;
        playerState.nextPiece = this.pieceGenerator.getPiece(playerState.piecesPlaced);
        playerState.piecesPlaced += 1;

        const piece: Piece = { type: next, x: Math.floor(WIDTH / 2) - 1, y: -1, rotation: 0 };

        playerState.activePiece = piece;
        // immediate collision -> player loses
        if (this.collides(playerState.board, piece)) {
          logger.info(`player ${playerId} collided on spawn and dies`);
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
        playerState.board = this.renderBoardWithPiece(playerState.board, playerState.activePiece);
        playerState.activePiece = null;
        // clear lines
        this.computeLinesClearedReward(newState, playerId);
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
