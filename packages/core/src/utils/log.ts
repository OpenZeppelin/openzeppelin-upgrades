import chalk from 'chalk';

import { indent } from './indent';

export function logWarning(title: string, lines: string[] = []): void {
  const parts = [chalk.keyword('orange').bold('Warning:') + ' ' + title + '\n'];

  if (lines.length > 0) {
    parts.push(lines.map(l => indent(l, 4) + '\n').join(''));
  }

  console.error(parts.join('\n'));
}
