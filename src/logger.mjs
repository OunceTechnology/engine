import pino from 'pino';

let logger;

export function createLogger(level) {
  logger = pino({ level });
}

export { logger };
