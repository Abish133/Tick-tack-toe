/** Shared board geometry. Persisted games without boardSize keep their 3x3 rules. */
export const BOARD_SIZES = Object.freeze([3, 4, 5, 6]);
export const WIN_LINES = Object.freeze([[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]].map(Object.freeze));
const lineCache = new Map([[3, WIN_LINES]]);

export function boardSizeOf(value) {
  if (BOARD_SIZES.includes(value?.boardSize)) return value.boardSize;
  const board = Array.isArray(value) ? value : value?.board;
  const size = Math.sqrt(board?.length ?? 9);
  return BOARD_SIZES.includes(size) ? size : 3;
}

/** Every contiguous run of three in each direction; longer runs have overlapping windows. */
export function getWinningLines(boardSize = 3) {
  if (!BOARD_SIZES.includes(boardSize)) throw new RangeError('Board size must be 3, 4, 5 or 6.');
  if (lineCache.has(boardSize)) return lineCache.get(boardSize);
  const lines = [];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    for (let row = 0; row < boardSize; row += 1) for (let col = 0; col < boardSize; col += 1) {
      const lastRow = row + 2 * dr; const lastCol = col + 2 * dc;
      if (lastRow < 0 || lastRow >= boardSize || lastCol < 0 || lastCol >= boardSize) continue;
      lines.push(Object.freeze(Array.from({ length: 3 }, (_, step) => (row + step * dr) * boardSize + col + step * dc)));
    }
  }
  const result = Object.freeze(lines); lineCache.set(boardSize, result); return result;
}

export function lineCells(boardSize, axis, index) {
  return Array.from({ length: boardSize }, (_, offset) => axis === 'row' ? index * boardSize + offset : offset * boardSize + index);
}

export function completedTriplets(board, boardSize = boardSizeOf(board)) {
  return getWinningLines(boardSize).filter(line => board[line[0]] != null && line.every(cell => board[cell] === board[line[0]]));
}

export function scoresForBoard(board, playerIds = [], boardSize = boardSizeOf(board)) {
  const scores = Object.fromEntries(playerIds.map(id => [id, 0]));
  for (const line of completedTriplets(board, boardSize)) {
    const owner = board[line[0]]; scores[owner] = (scores[owner] ?? 0) + 1;
  }
  return scores;
}
