import util from 'util';
import chalk from 'chalk';

function noDetails() {
  return '';
}

export abstract class UpgradesError extends Error {
  constructor(message: string, details = noDetails) {
    super(message + '\n\n' + details());
  }

  [util.inspect.custom](): string {
    return chalk.red.bold('Error:') + ' ' + this.message;
  }
}
