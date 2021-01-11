import util from 'util';
import { ValidationError } from './extendable-error.mjs';

function checkError(res) {
  return function (e) {
    if (e instanceof ValidationError) {
      return res.status(422).send({ message: e.message });
    }

    console.warn(util.inspect(e));
    res.sendStatus(500);
  };
}

export default checkError;
