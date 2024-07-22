// from https://github.com/NomicFoundation/hardhat-vscode/blob/development/server/src/utils/operatingSystem.ts
import { exec } from 'child_process';
import os from 'os';

export function runningOnWindows() {
  return os.platform() === 'win32';
}

export async function runCmd(cmd: string, cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd }, function (error, stdout) {
      if (error !== null) {
        reject(error);
      }

      resolve(stdout);
    });
  });
}

export function getPlatform() {
  return `${os.platform()}-${os.arch()}`;
}
