// from https://github.com/NomicFoundation/hardhat-vscode/blob/development/server/src/parser/slangHelpers.ts
import { getPlatform } from './operatingSystem';

const SUPPORTED_PLATFORMS = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-ia32',
  'win32-x64',
];

export function isSlangSupported() {
  const currentPlatform = getPlatform();

  return SUPPORTED_PLATFORMS.includes(currentPlatform);
}
