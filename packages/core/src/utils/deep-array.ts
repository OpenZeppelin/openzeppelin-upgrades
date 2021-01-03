export type DeepArray<T> = T | DeepArray<T>[];

export function deepEqual<T>(a: DeepArray<T>, b: DeepArray<T>): boolean {
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    for (const [i, x] of a.entries()) {
      if (!deepEqual(x, b[i])) {
        return false;
      }
    }
    return true;
  } else {
    if (Array.isArray(b)) {
      return false;
    }
    return a === b;
  }
}
