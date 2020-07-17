import util from 'util';
import chalk from 'chalk';

export abstract class UpgradesError extends Error {
  abstract details(): string;

  constructor(message: string) {
    super(message);
  }

  [util.inspect.custom](): string {
    return chalk.red.bold('Error:') + ' ' + this.message + '\n\n' + this.details();
  }
}
