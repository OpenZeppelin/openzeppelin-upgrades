// eslint-disable-next-line @typescript-eslint/ban-types
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const res: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    res[key] = obj[key];
  }
  return res as Pick<T, K>;
}
