export type Operation<T, R> =
  | {
      kind: 'replaced';
      result: R;
      original: T;
      updated: T;
    }
  | {
      kind: 'appended' | 'inserted';
      original?: undefined;
      updated: T;
    }
  | {
      kind: 'deleted';
      original: T;
      updated?: undefined;
    };

type Match<T, R> = (a: T, b: T) => R;

export function levenshtein<T, R>(
  a: T[],
  b: T[],
  match: Match<T, R>,
  isEqualMatch: (result: R) => boolean,
): Operation<T, R>[] {
  const matrix = buildMatrix(a, b, match, isEqualMatch);
  return buildOps(matrix, a, b);
}

const SUBSTITUTION_COST = 3;
const INSERTION_COST = 2;
const DELETION_COST = 2;

type MatrixEntry<T, R> = (Operation<T, R> | { kind: 'nop' }) & { totalCost: number; predecessor?: MatrixEntry<T, R> };

function buildMatrix<T, R>(
  a: T[],
  b: T[],
  match: Match<T, R>,
  isEqualMatch: (result: R) => boolean,
): MatrixEntry<T, R>[][] {
  // matrix[i][j] will contain the last operation that takes a.slice(0, i) to b.slice(0, j)
  // The list of operations can be recovered following the predecessors as in buildOps

  const matrix: MatrixEntry<T, R>[][] = new Array(a.length + 1);

  matrix[0] = new Array(b.length + 1);
  matrix[0][0] = { kind: 'nop', totalCost: 0 };

  // Populate first row
  for (let j = 1; j <= b.length; j++) {
    matrix[0][j] = insertion(0, j);
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    matrix[i] = new Array(b.length + 1);
    matrix[i][0] = deletion(i, 0);
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = minBy([substitution(i, j), insertion(i, j), deletion(i, j)], e => e.totalCost);
    }
  }

  return matrix;

  // The different kinds of matrix entries are built by these helpers

  function insertion(i: number, j: number): MatrixEntry<T, R> {
    const updated = b[j - 1];
    const predecessor = matrix[i][j - 1];
    const predCost = predecessor.totalCost;
    if (j > a.length) {
      return { kind: 'appended', totalCost: predCost, predecessor, updated };
    } else {
      return { kind: 'inserted', totalCost: predCost + INSERTION_COST, predecessor, updated };
    }
  }

  function deletion(i: number, j: number): MatrixEntry<T, R> {
    const original = a[i - 1];
    const predecessor = matrix[i - 1][j];
    const predCost = predecessor.totalCost;
    return { kind: 'deleted', totalCost: predCost + DELETION_COST, predecessor, original };
  }

  function substitution(i: number, j: number): MatrixEntry<T, R> {
    const original = a[i - 1];
    const updated = b[j - 1];
    const predecessor = matrix[i - 1][j - 1];
    const predCost = predecessor.totalCost;
    const result = match(original, updated);
    if (isEqualMatch(result)) {
      return { kind: 'nop', totalCost: predCost, predecessor };
    } else {
      return { kind: 'replaced', totalCost: predCost + SUBSTITUTION_COST, predecessor, result, original, updated };
    }
  }
}

function minBy<T>(arr: [T, ...T[]], value: (item: T) => number): T {
  return arr.reduce((min, item) => (value(item) < value(min) ? item : min));
}

function buildOps<T, R>(matrix: MatrixEntry<T, R>[][], a: T[], b: T[]): Operation<T, R>[] {
  const ops: Operation<T, R>[] = [];

  let entry: MatrixEntry<T, R> | undefined = matrix[a.length][b.length];

  while (entry !== undefined) {
    if (entry.kind !== 'nop') {
      ops.unshift(entry);
    }
    entry = entry.predecessor;
  }

  return ops;
}
