import { BOARD_SIZES } from './game-engine/geometry.js';

const sizeOf = size => BOARD_SIZES.includes(size) ? size : 3;
export const isEffectCell = (cell, size = 3) => Number.isInteger(cell) && cell >= 0 && cell < sizeOf(size) ** 2;
export function effectCellPosition(cell, size = 3) {
  const boardSize = sizeOf(size);
  return { left: `${((cell % boardSize) + 0.5) * 100 / boardSize}%`, top: `${(Math.floor(cell / boardSize) + 0.5) * 100 / boardSize}%` };
}
export function effectLinePosition(axis, index, size = 3) {
  const boardSize = sizeOf(size);
  if (!['row', 'column'].includes(axis) || !Number.isInteger(index) || index < 0 || index >= boardSize) return { left: '50%', top: '50%' };
  const middle = `${(index + 0.5) * 100 / boardSize}%`;
  return axis === 'row' ? { left: '50%', top: middle } : { left: middle, top: '50%' };
}
