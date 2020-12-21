import assert from 'assert';

type Match<T, R extends MatchResult> = (a: T, b: T) => R;

interface MatchResult {
  isEqual(): boolean;
}

export function levenshtein<T, R extends MatchResult>(a: T[], b: T[], match: Match<T, R>): Operation<T, R>[] {
  const matrix = buildMatrix(a, b, (a, b) => match(a, b).isEqual());
  return walkMatrix(matrix, a, b, match);
}

type Equal<T> = (a: T, b: T) => boolean;

const SUBSTITUTION_COST = 3;
const INSERTION_COST = 2;
const DELETION_COST = 2;

// Adapted from https://gist.github.com/andrei-m/982927 by Andrei Mackenzie
function buildMatrix<T>(a: T[], b: T[], eq: Equal<T>): number[][] {
  const matrix: number[][] = new Array(a.length + 1);

  type CostFunction = (i: number, j: number) => number;
  const insertionCost: CostFunction = (i, j) => (j > a.length ? 0 : INSERTION_COST);
  const substitutionCost: CostFunction = (i, j) => (eq(a[i - 1], b[j - 1]) ? 0 : SUBSTITUTION_COST);
  const deletionCost: CostFunction = () => DELETION_COST;

  // increment along the first column of each row
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = new Array(b.length + 1);
    matrix[i][0] = i * deletionCost(i, 0);
  }

  // increment each column in the first row
  for (let j = 1; j <= b.length; j++) {
    matrix[0][j] = matrix[0][j - 1] + insertionCost(0, j);
  }

  // fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j - 1] + substitutionCost(i, j),
        matrix[i][j - 1] + insertionCost(i, j),
        matrix[i - 1][j] + deletionCost(i, j),
      );
    }
  }

  return matrix;
}

export type Operation<T, R extends MatchResult> =
  | {
      kind: 'custom';
      match: R;
      original: T;
      updated: T;
    }
  | {
      kind: 'append' | 'insert';
      original?: undefined;
      updated: T;
    }
  | {
      kind: 'delete';
      original: T;
      updated?: undefined;
    };

// Walks an edit distance matrix, returning the sequence of operations performed
function walkMatrix<T, R extends MatchResult>(
  matrix: number[][],
  a: T[],
  b: T[],
  match: Match<T, R>,
): Operation<T, R>[] {
  let i = matrix.length - 1;
  let j = matrix[0].length - 1;

  const operations: Operation<T, R>[] = [];

  while (i > 0 || j > 0) {
    const cost = matrix[i][j];

    const isAppend = j >= matrix.length;
    const insertionCost = isAppend ? 0 : INSERTION_COST;

    const matchResult = i > 0 && j > 0 ? match(a[i - 1], b[j - 1]) : undefined;
    const substitutionCost = matchResult?.isEqual() ? 0 : SUBSTITUTION_COST;

    const original = i > 0 ? a[i - 1] : undefined;
    const updated = j > 0 ? b[j - 1] : undefined;

    if (i > 0 && j > 0 && cost === matrix[i - 1][j - 1] + substitutionCost) {
      assert(matchResult !== undefined && original !== undefined && updated !== undefined);
      if (!matchResult?.isEqual()) {
        operations.unshift({ kind: 'custom', match: matchResult, updated, original });
      }
      i--;
      j--;
    } else if (j > 0 && cost === matrix[i][j - 1] + insertionCost) {
      assert(updated !== undefined);
      operations.unshift({ kind: isAppend ? 'append' : 'insert', updated });
      j--;
    } else if (i > 0 && cost === matrix[i - 1][j] + DELETION_COST) {
      assert(original !== undefined);
      operations.unshift({ kind: 'delete', original });
      i--;
    } else {
      throw Error(`Could not walk matrix at position ${i},${j}`);
    }
  }

  return operations;
}
