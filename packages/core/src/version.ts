import crypto from 'crypto';

export function getVersionId(deployedBytecode: string) {
  const hash = crypto.createHash('sha256');
  hash.update(deployedBytecode.replace(/^0x/, ''));
  return hash.digest().toString('base64');
}
