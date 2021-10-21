import bcrypt from 'bcryptjs';

const SALT_WORK_FACTOR_ = 10;

export class Auth {
  constructor(database, ObjectId) {
    this.db = database;
    this.ObjectId = ObjectId;
  }

  async authenticate(email, password) {
    const isEmail = typeof email === 'string' && email.includes('@');
    // normalize username
    const conditions = isEmail
      ? {
          $or: [
            { username: email },
            { email },
            { lowerEmail: email.toLowerCase() },
          ],
        }
      : { _id: new this.ObjectId(email) };

    const [user, hash] = await this.findUser(conditions);

    if (!user || !hash) {
      return false;
    }

    const isMatch = await bcrypt.compare(password, hash);

    return isMatch ? user : false;
  }

  async findUser(query) {
    const conditions = {
      $or: [{ isActive: 'yes' }, { isActive: true }],
      ...query,
    };

    if (conditions._id && typeof conditions._id === 'string') {
      conditions._id = new this.ObjectId(conditions._id);
    }

    const user = await this.db.users.findOne(conditions, {
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
}
