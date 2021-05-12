import JSONWebToken from './jsonwebtoken.js';
import { logger } from './logger.js';
import { databaseUsers as Users } from './models/database-users.js';

const AUTH_TYPE = 'Bearer';

/**
 * Attempt to find the JWT in body parameters.
 *
 * @param {Request} req incoming http request.
 * @return {string|false} JWT string or false.
 */
function extractJWTBody(req) {
  if (typeof req.body === 'object' && req.body.jwt) {
    return req.body.jwt;
  }
  return false;
}

/**
 * Attempt to find the JWT in query parameters.
 *
 * @param {Request} req incoming http request.
 * @return {string|false} JWT string or false.
 */
function extractJWTQS(req) {
  if (typeof req.query === 'object' && req.query.jwt) {
    return req.query.jwt;
  }
  return false;
}

/**
 *  Attempt to find the JWT in the Authorization header.
 *
 * @param {Request} req incoming http request.
 * @return {string|false} JWT string or false.
 */
function extractJWTHeader(req) {
  const { authorization } = req.headers;
  if (!authorization) {
    return false;
  }
  const [type, sig] = authorization.split(' ');
  if (type !== AUTH_TYPE) {
    logger.warn('JWT header extraction failed: invalid auth type');
    return false;
  }
  return sig;
}

/**
 * Authenticate the incoming call by checking it's JWT.
 *
 * TODO: User error messages.
 */
async function authenticate(req) {
  const sig = extractJWTHeader(req) || extractJWTQS(req) || extractJWTBody(req);
  if (!sig) {
    return false;
  }
  const jwt = await JSONWebToken.verifyJWT(sig);

  if (jwt) {
    const userRoles = await Users.getUserById(jwt.user);
    return { jwt, userRoles };
  }
}

function middleware() {
  return (req, res, next) => {
    authenticate(req, res)
      .then(({ jwt, userRoles } = {}) => {
        if (!jwt) {
          res.status(401).end();
          return;
        }

        req.jwt = jwt;
        req.user = { id: jwt.user, ...userRoles };
        next();
      })
      .catch(err => {
        logger.error('error running jwt middleware', err.stack);
        next(err);
      });
  };
}

export {
  middleware as jwtMiddleware,
  authenticate,
  extractJWTQS,
  extractJWTHeader,
};
