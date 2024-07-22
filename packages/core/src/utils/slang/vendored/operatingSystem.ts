// from https://github.com/NomicFoundation/hardhat-vscode/blob/development/server/src/utils/operatingSystem.ts
import os from 'os';

export function getPlatform() {
  return `${os.platform()}-${os.arch()}`;
}
