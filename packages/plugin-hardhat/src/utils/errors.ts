export function isErrorCode(e: unknown, code: string): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && (e as NodeJS.ErrnoException).code === code;
}
