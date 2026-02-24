import { logger } from '../utils/logger';
import { BSP_SCORES, PLAYGROUND_HEIGHT, PLAYGROUND_WIDTH, STANDARD_FIRST_SPEED, TETROMINOS } from './contstants';
import { PieceGenerator } from './PieceGenerator';
import { GameState, Intent, Piece, PlayerState } from './types';

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
  private width: number;
  private height: number;

  constructor(seed = 'default') {
    this.seed = seed;
    const h = hashStringToSeed(seed);
    this.width = PLAYGROUND_WIDTH;
    this.height = PLAYGROUND_HEIGHT;
    this.pieceGenerator = new PieceGenerator(h, TETROMINOS);
  }

  private cloneState<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }

  private createEmptyBoard(): number[][] {
    return Array.from({ length: this.height }, () => Array.from({ length: this.width }, () => 0));
  }

  createInitialState(playerIds: string[]): GameState {
    const playerStates: Record<string, PlayerState> = Object.fromEntries(
      playerIds.map((id) => [
        id,
        {
          board: this.createEmptyBoard(),
          activePiece: null,
          nextPiece: null,
          speed: 0,
          piecesPlaced: 0,
          holdPiece: null,
          holdLocked: false,
          score: 0,
          isAlive: true,
          diedAt: null,
          name: '',
        },
      ])
    );

    return {
      status: 'waiting',
      tick: 0,
      speed: STANDARD_FIRST_SPEED,
      playerStates,
      initialPlayerCount: playerIds.length,
    } as GameState;
  }

  addPlayer(state: GameState, playerId: string): GameState {
    const newState: GameState = this.cloneState(state);
    newState.playerStates[playerId] = {
      board: this.createEmptyBoard(),
      activePiece: null,
      nextPiece: null,
      speed: 0,
      piecesPlaced: 0,
      holdPiece: null,
      holdLocked: false,
      score: 0,
      isAlive: true,
      diedAt: null,
      name: '',
    };
    return newState;
  }

  collides(board: number[][], piece: Piece) {
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
        if (x < 0 || x >= this.width || y >= this.height) {
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
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
          newBoard[y][x] = color;
        }
      }
    }
    return newBoard;
  }

  public renderBoardWithGhost(board: number[][], piece: Piece | null) {
    const newBoard = cloneBoard(board);
    if (!piece) {
      return newBoard;
    }

    let y = piece.y;
    let landedY = y;

    while (true) {
      const candidate: Piece = { ...piece, y: y + 1 };
      if (this.collides(board, candidate)) {
        landedY = y;
        break;
      }
      y += 1;
      if (y > this.height + 5) {
        landedY = y;
        break;
      }
    }

    const { piece: mat } = this.pieceGenerator.getPieceShapeAndColor(piece.type, piece.rotation);
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (!mat[r][c]) {
          continue;
        }
        const x = piece.x + c;
        const yy = landedY + r;
        if (yy >= 0 && yy < this.height && x >= 0 && x < this.width) {
          if (!newBoard[yy][x]) {
            newBoard[yy][x] = -2;
          }
        }
      }
    }

    const { piece: mat2, color } = this.pieceGenerator.getPieceShapeAndColor(piece.type, piece.rotation);
    for (let r = 0; r < mat2.length; r++) {
      for (let c = 0; c < mat2[r].length; c++) {
        if (!mat2[r][c]) {
          continue;
        }
        const x = piece.x + c;
        const y2 = piece.y + r;
        if (y2 >= 0 && y2 < this.height && x >= 0 && x < this.width) {
          newBoard[y2][x] = color;
        }
      }
    }

    return newBoard;
  }

  /** Clear completed lines from a board and return the new board and number of cleared lines. */
  clearLines(board: number[][]) {
    const newBoard: number[][] = [];
    let cleared = 0;

    for (const row of board) {
      if (!row.every((cell) => cell !== 0)) {
        newBoard.push(row);
        continue;
      }

      newBoard.unshift(Array.from({ length: this.width }, () => 0));
      cleared += 1;
    }

    return { board: newBoard, cleared };
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

    // HOLD (buffer) handling
    if (input.type === 'hold') {
      // cannot hold if already used since last placement
      if (player.holdLocked) {
        return newState;
      }

      const activeType = player.activePiece!.type;
      if (!player.holdPiece) {
        // move current piece into hold, spawn will occur next tick
        player.holdPiece = activeType;
        player.activePiece = null;
        player.holdLocked = true;
      } else {
        // swap: take held piece into active (spawn position), put current into hold
        const held = player.holdPiece;
        player.holdPiece = activeType;
        const spawn: Piece = { type: held, x: Math.floor(this.width / 2) - 1, y: -1, rotation: 0 };
        if (this.collides(player.board, spawn)) {
          // spawn collision -> player dies
          player.isAlive = false;
          player.diedAt = new Date();
          player.activePiece = null;
        } else {
          player.activePiece = spawn;
        }
        player.holdLocked = true;
      }

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
      const base = player.activePiece ?? cur;
      const rotated: Piece = { type: base.type, x: base.x, y: base.y, rotation: base.rotation + 1 };
      if (!this.collides(player.board, rotated)) {
        player.activePiece = rotated;
      } else {
        for (const dy of [-1, -2]) {
          const candidate: Piece = { ...rotated, y: base.y + dy };
          if (!this.collides(player.board, candidate)) {
            player.activePiece = candidate;
            break;
          }
        }
      }
    } else if (input.type === 'soft') {
      tryMove(0, 1);
    } else if (input.type === 'hard') {
      while (tryMove(0, 1));

      const dropRows = (player.activePiece?.y ?? 0) - cur.y;

      player.board = this.renderBoardWithPiece(player.board, player.activePiece);
      player.activePiece = null;

      this.computeLinesClearedReward(newState, playerId, dropRows, true);

      player.holdLocked = false;
    }

    return newState;
  }

  computeLinesClearedReward(state: GameState, playerId: string, dropRows = 0, isHard = false) {
    const { board: clearedBoard, cleared } = this.clearLines(state.playerStates[playerId].board);
    state.playerStates[playerId].board = clearedBoard;

    const base = BSP_SCORES[cleared];
    const dropBonus = isHard ? Math.max(0, dropRows + 1) : 0;

    state.playerStates[playerId].score += base + dropBonus;

    if (cleared > 1) {
      const generatedLine = Array.from({ length: this.width }, () => -1);
      generatedLine[Math.floor(Math.random() * this.width)] = 0;

      const garbageLines = cleared - 1;
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

        const piece: Piece = { type: next, x: Math.floor(this.width / 2) - 1, y: -1, rotation: 0 };

        playerState.activePiece = piece;
        if (this.collides(playerState.board, piece)) {
          logger.info(`player ${playerId} collided on spawn and dies`);
          playerState.isAlive = false;
          playerState.diedAt = new Date();
          continue;
        }
      }
    }

    if (newState.tick % 200 === 0) {
      newState.speed = Math.max(1, newState.speed - 1);
    }

    if (newState.tick % newState.speed !== 0) {
      return newState;
    }

    // gravity step: attempt to move down
    for (const [playerId, playerState] of Object.entries(newState.playerStates)) {
      if (!playerState.isAlive || !playerState.activePiece) {
        continue;
      }

      const moved: Piece = { ...playerState.activePiece, y: playerState.activePiece.y + 1 };
      if (!this.collides(playerState.board, moved)) {
        playerState.activePiece = moved;
      } else {
        playerState.board = this.renderBoardWithPiece(playerState.board, playerState.activePiece);
        playerState.activePiece = null;
        this.computeLinesClearedReward(newState, playerId);
        playerState.holdLocked = false;
      }
    }

    // check KO: if only one or zero players alive and game was running, finish
    const alive = Object.values(newState.playerStates).filter((p) => p.isAlive).length;
    const initAlive = newState.initialPlayerCount;
    if (newState.status === 'running' && (initAlive > 1 ? alive <= 1 : alive === 0)) {
      newState.status = 'finished';
    }

    return newState;
  }
}
