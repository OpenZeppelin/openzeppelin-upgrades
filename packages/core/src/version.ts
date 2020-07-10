import crypto from 'crypto';

export function getVersionId(bytecode: string) {
  const hash = crypto.createHash('sha256');
  hash.update(bytecode.replace(/^0x/, ''));
  return hash.digest().toString('base64');
}
