export function assert(p: unknown): asserts p {
  if (!p) {
    throw new Error('An unexpected condition occurred. Please report this at https://zpl.in/upgrades/report');
  }
}
