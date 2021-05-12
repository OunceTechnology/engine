import auth from './auth.js';
import checkError from './check-error.js';
import {
  ConflictError,
  NotAcceptableError,
  NotFoundError,
  ValidationError,
} from './extendable-error.js';
import JSONWebToken from './jsonwebtoken.js';
import { jwtMiddleware } from './jwt-middleware.js';
import RandomString from './lib/random-string.js';
import sendmail from './lib/sendmail.js';
import { logger } from './logger.js';
import { databaseTeams } from './models/database-teams.js';
import { databaseUsers, UserHelper } from './models/database-users.js';
import { db } from './models/db.js';
import * as Model from './models/index.js';
import userUtils from './models/user-utils.js';
import notfound from './notfoundroutes.js';
import Passwords from './passwords.js';
import { program, serverController } from './server.js';

const toObjectId = db.toObjectId;

export {
  Passwords,
  JSONWebToken,
  Model,
  toObjectId,
  // serverConfig,
  databaseTeams as Teams,
  databaseUsers as Users,
  UserHelper,
  userUtils,
  RandomString,
  sendmail,
  jwtMiddleware,
  logger,
};
export {
  db,
  auth,
  ConflictError,
  ValidationError,
  NotAcceptableError,
  NotFoundError,
  checkError,
  serverController,
  program,
  notfound,
};
