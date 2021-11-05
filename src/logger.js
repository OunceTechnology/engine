import process from 'node:process';
import pino from 'pino';

let logger;

export function createLogger(options, location) {
  const destination = pino.destination(location);

  if (location) {
    process.on('SIGHUP', () => {
      logger && logger.debug('reopen destination');
      destination.reopen();
    });
  }

  return pino(options, destination);
}

export function initLogger(options) {
  logger = createLogger(options);
}

export { logger };
