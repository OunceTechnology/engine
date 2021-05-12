import util from 'util';
import { ValidationError } from './extendable-error.js';
import { logger } from './logger.js';

function checkError(res) {
  return function (e) {
    if (e instanceof ValidationError) {
      return res.status(422).send({ message: e.message });
    }

    logger.warn(util.inspect(e));
    res.sendStatus(500);
  };
}

export default checkError;
