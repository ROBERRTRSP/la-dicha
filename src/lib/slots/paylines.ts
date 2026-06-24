/** 10 líneas estándar en rejilla 5×3 (filas 0= arriba, 1= centro, 2= abajo). */
export const PAYLINES_5x3: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
];

export function readPayline(grid: string[][], line: number[]): string[] {
  return line.map((row, col) => grid[col][row]);
}
