import { ExtendableError } from './extendable-error.mjs';

function notfound(serverController) {
  const app = serverController.expressApp;

  const jsonErrors = app.get('json errors');

  const sendResponse = ({ res, code, message, key }) => {
    return jsonErrors
      ? res.status(code).json({ message, key })
      : res.status(code).send(message);
  };

  // assume "not found" in the error msgs;
  // is a 404. this is somewhat silly, but;
  // valid, you can do whatever you like, set;
  // properties, use instanceof etc.
  app.use((err, req, res, next) => {
    if (err instanceof ExtendableError) {
      const { message, key, code } = err;

      return sendResponse({ res, code, message, key });
    }

    console.log('404');
    if (err.status !== undefined) {
      const { message, status: code } = err;

      return sendResponse({ res, code, message });
    }

    // treat as 404;
    if (
      err.message &&
      (err.message.indexOf('not found') !== -1 ||
        err.message.indexOf('Cast to ObjectId failed') !== -1)
    ) {
      return next();
    }
    // log it;
    // send emails if you want;
    console.error(`errchk: ${err.stack || err.message || err}`);

    // error page;

    return sendResponse({ res, message: 'Internal Server Error', code: 500 });
  });

  // assume 404 since no middleware responded;
  app.use((req, res) => {
    // could consider if xhr requests need different response?

    return sendResponse({ res, message: 'Not Found', code: 404 });
  });
}

export default notfound;
