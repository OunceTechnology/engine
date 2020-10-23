import bcrypt from 'bcrypt-nodejs';
import util from 'util';
import { db } from './models/db.mjs';

const bcryptCompareAsync = util.promisify(bcrypt.compare);
const bcryptGenSaltAsync = util.promisify(bcrypt.genSalt);
const bcryptHashAsync = util.promisify(bcrypt.hash);

async function encryptPassword(password) {
  const SALT_WORK_FACTOR = 10;

  // generate a salt and return hash
  const salt = await bcryptGenSaltAsync(SALT_WORK_FACTOR);

  return bcryptHashAsync(password, salt, null);
}

async function authenticate(email, password) {
  const isEmail = typeof email === 'string' && email.indexOf('@') > -1;
  // normalize username
  const conditions = isEmail
    ? {
        $or: [
          { username: email },
          { email },
          { lowerEmail: email.toLowerCase() },
        ],
      }
    : { _id: db.toObjectId(email) };

  const [user, hash] = await findUser(conditions);

  if (!user || !hash) {
    return false;
  }

  const isMatch = await bcryptCompareAsync(password, hash);

  return isMatch ? user : false;
}

async function findUser(query) {
  const conditions = {
    $or: [{ isActive: 'yes' }, { isActive: true }],
    ...query,
  };

  if (conditions._id && typeof conditions._id === 'string') {
    conditions._id = db.toObjectId(conditions._id);
  }

  const user = await db.users.findOne(conditions, {
    projection: {
      _id: 1,
      username: 1,
      email: 1,
      role: 1,
      groups: 1,
      name: 1,
      resources: 1,
      teams: 1,
      password: 1,
    },
  });
  if (user) {
    if (!user.teams) {
      user.teams = user.resources || [];
    }

    if (!user.role && user.groups) {
      user.role = user.groups[0] || '';
    }
    delete user.resources;
    delete user.groups;
    const { password, ...userWithoutPassword } = user;

    return [userWithoutPassword, password];
  }
  return [];
}

export default {
  authenticate,
  encryptPassword,
  findUser,
};
