import auth from './auth.mjs';
import checkError from './check-error.mjs';
import { db } from './models/db.mjs';
import {
  ConflictError,
  ValidationError,
  NotAcceptableError,
  NotFoundError,
} from './extendable-error.mjs';
import notfound from './notfoundroutes.mjs';
import serverController from './server-controller.mjs';

import Passwords from './passwords.mjs';
import JSONWebToken from './jsonwebtoken.mjs';
import * as Model from './models/index.mjs';
import userUtils from './models/user-utils.mjs';

const toObjectId = db.toObjectId;
import { databaseTeams } from './models/database-teams.mjs';
import { databaseUsers, UserHelper } from './models/database-users.mjs';
import RandomString from './lib/random-string.mjs';
// import serverConfig from './config/server-config.mjs';

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
  notfound,
};
