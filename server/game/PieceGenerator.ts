const TETROMINOS: Record<string, number[][][]> = {
  I: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
    ],
    [
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1],
    ],
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
    ],
    [
      [0, 1],
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  ],
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
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
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
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  ],
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
    ],
    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
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
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 0, 0],
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

export class PieceGenerator {
  private seed: number;
  private generatedPieces: number[] = [];

  constructor(seed: number) {
    this.seed = seed;
  }

  getPieceShapeAndColor(type: string, rotation: number): { piece: number[][]; color: number } {
    const shapes = TETROMINOS[type];
    if (!shapes) {
      throw new Error(`Invalid piece type: ${type}`);
    }
    return { piece: shapes[rotation % shapes.length], color: PIECE_TYPES.indexOf(type) + 1 };
  }

  getPiece(iteration: number): string {
    while (iteration >= this.generatedPieces.length) {
      this.generateNextPiece();
    }

    return PIECE_TYPES[this.generatedPieces[iteration]];
  }

  private generateNextPiece() {
    this.generatedPieces.push(this.seed % PIECE_TYPES.length);
    this.seed = (this.seed * 48271) % 2147483647;
  }
}
