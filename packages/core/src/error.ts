import util from 'util';
import chalk from 'chalk';

interface ErrorDescriptor<E> {
  msg: (e: E) => string;
  hint?: string;
  link: string;
}

export type ErrorDescriptions<E extends { kind: string }> = {
  [K in E['kind']]: ErrorDescriptor<E & { kind: K }>;
};

export abstract class UpgradesError extends Error {
  abstract details(): string;

  constructor(message: string) {
    super(message);
  }

  [util.inspect.custom](): string {
    return chalk.red.bold('Error:') + ' ' + this.message + '\n\n' + this.details();
  }
}
