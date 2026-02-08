export class PieceGenerator {
  private seed: number;
  private generatedPieces: number[] = [];
  private tetrominos: Record<string, number[][][]>;

  constructor(seed: number, tetrominos: Record<string, number[][][]>) {
    this.seed = seed;
    this.tetrominos = tetrominos;
  }

  getPieceShapeAndColor(type: string, rotation: number): { piece: number[][]; color: number } {
    const shapes = this.tetrominos[type];
    if (!shapes) {
      throw new Error(`Invalid piece type: ${type}`);
    }
    return { piece: shapes[rotation % shapes.length], color: Object.keys(this.tetrominos).indexOf(type) + 1 };
  }

  getPiece(iteration: number): string {
    while (iteration >= this.generatedPieces.length) {
      this.generateNextPiece();
    }

    return Object.keys(this.tetrominos)[this.generatedPieces[iteration]];
  }

  private generateNextPiece() {
    const arr = Array.from({ length: Object.keys(this.tetrominos).length }, (_, i) => i);
    while (arr.length > 0) {
      const next = this.seed % arr.length;
      this.generatedPieces.push(arr[next]);
      arr.splice(next, 1);
      this.seed = (this.seed * 48271) % 2147483647;
    }
  }
}
