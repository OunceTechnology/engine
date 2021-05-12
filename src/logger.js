import pino from 'pino';

let logger;

export function createLogger(opts, location) {
  const destination = pino.destination(location);

  if (location) {
    process.on('SIGHUP', () => {
      logger && logger.debug('reopen destination');
      destination.reopen();
    });
  }

  return pino(opts, destination);
}

export function initLogger(opts) {
  logger = createLogger(opts);
}

export { logger };
