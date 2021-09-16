export function makeNonEnumerable<O extends any>(obj: O, key: keyof O): void {
  Object.defineProperty(obj, key, { enumerable: false });
}
