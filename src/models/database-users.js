/* eslint-disable unicorn/no-array-callback-reference */
import UserHelper from './user-helper.js';

export class Users {
  constructor(database, ObjectId, kmsHandler) {
    this.db = database;
    this.ObjectId = ObjectId;
    this.kmsHandler = kmsHandler;
  }
  async deleteUserById(id) {
    const {
      lastErrorObject: { n },
    } = await this.db.users.findOneAndDelete({ _id: new this.ObjectId(id) }, { projection: { _id: 1 } });

    if (n !== 1) {
      throw new Error('User account not deleted');
    }
  }

  async updateUser(id, fields, teams) {
    const encryptDecrypt = this.kmsHandler.getEncryptDecrypt();
    const userHelper = new UserHelper(encryptDecrypt);
    const encryptedFields = await userHelper.encryptedUser(fields);

    const update = {
      $set: { ...encryptedFields, updated: new Date() },
    };

    const updateAdded = {};
    if (teams) {
      if (!Array.isArray(teams)) {
        // handle teams

        const { added, removed } = teams;
        if (removed && removed.length > 0) {
          update.$pull = { teams: { id: { $in: removed } } };
        }
        if (added && added.length > 0) {
          const addedTeams = added.map(id => ({ id, role: 'manager' }));

          const target = removed && removed.length > 0 ? updateAdded : update;

          target.$addToSet = { teams: { $each: addedTeams } };
        }
      } else {
        fields.teams = teams.map(({ id, role }) => ({ id, role }));
      }
    }

    const {
      lastErrorObject: { n },
    } = await this.db.users.findOneAndUpdate({ _id: new this.ObjectId(id) }, update, {
      projection: { _id: 1, username: 1 },
    });

    if (n !== 1) {
      throw new Error('Failed updating user');
    }

    if (updateAdded.$addToSet) {
      const {
        lastErrorObject: { n: n2 },
      } = await this.db.users.findOneAndUpdate({ _id: new this.ObjectId(id) }, updateAdded, {
        projection: { _id: 1 },
      });

      if (n2 !== 1) {
        throw new Error('Failed updating user');
      }
    }
  }

  async getUserById(id, { nameOnly = false } = {}) {
    const projection = nameOnly ? { email: 1, username: 1, name: 1 } : { password: 0 };
    const encryptedUser = await this.db.users.findOne(
      { _id: new this.ObjectId(id) },
      {
        projection,
      },
    );

    if (encryptedUser) {
      try {
        const encryptDecrypt = this.kmsHandler.getEncryptDecrypt();
        const userHelper = new UserHelper(encryptDecrypt);
        return await userHelper.user(encryptedUser);
      } catch (error) {
        console.dir(error.toString());
        return encryptedUser;
      }
    }
  }

  async setUserPassword(id, password) {
    const { ok } = await this.db.users.findOneAndUpdate(
      { _id: new this.ObjectId(id) },
      {
        $set: { password, passwordLastUpdated: new Date() },
        $unset: {
          resetToken: 1,
        },
      },
      { projection: { _id: 1, username: 1 } },
    );

    if (!ok) {
      throw new Error('Failed updating password, try again.');
    }
  }

  async getUserByIds(ids) {
    const databaseUsers = await this.db.users
      .find(
        {
          _id: { $in: ids.map(id => new this.ObjectId(id)) },
        },
        {
          projection: { password: 0 },
        },
      )
      .toArray();

    const encryptDecrypt = this.kmsHandler.getEncryptDecrypt();
    const userHelper = new UserHelper(encryptDecrypt);

    const users = await Promise.all(
      databaseUsers.map(async databaseUser => {
        try {
          return await userHelper.user(databaseUser);
        } catch (error) {
          console.dir(error.toString());
          return databaseUser;
        }
      }),
    );

    return users;
  }

  async findUsers(query, projection) {
    const databaseUsers = await this.db.users
      // eslint-disable-next-line unicorn/no-array-method-this-argument
      .find(query, {
        projection: projection ?? { name: 1, email: 1, username: 1, role: 1 },
      })
      .toArray();
    const encryptDecrypt = this.kmsHandler.getEncryptDecrypt();
    const userHelper = new UserHelper(encryptDecrypt);

    const users = await Promise.all(databaseUsers.map(async databaseUser => await userHelper.user(databaseUser)));

    return users;
  }

  async getUsers({ allUsers, teamIds }) {
    const query = {};

    if (!allUsers) {
      query.role = { $ne: 'system' };
    }

    if (teamIds) {
      query['teams.id'] = { $in: teamIds };
    }

    const databaseUsers = await this.db.users
      // eslint-disable-next-line unicorn/no-array-method-this-argument
      .find(query, {
        projection: { password: 0 },
      })
      .toArray();

    const encryptDecrypt = this.kmsHandler.getEncryptDecrypt();
    const userHelper = new UserHelper(encryptDecrypt);

    const users = await Promise.all(
      databaseUsers.map(async databaseUser => {
        try {
          return await userHelper.user(databaseUser);
        } catch (error) {
          console.dir(error.toString());
          return databaseUser;
        }
      }),
    );

    return users;
  }

  async getUser(email, username = email) {
    const encryptDecrypt = this.kmsHandler.getEncryptDecrypt();
    const userHelper = new UserHelper(encryptDecrypt);

    const query = {
      $or: [
        { username: await userHelper.encrypt(username) },
        { email: await userHelper.encrypt(email) },
        { lowerEmail: await userHelper.encrypt(email.toLowerCase()) },
      ],
    };

    const databaseUser = await this.db.users.findOne(query);
    if (databaseUser) {
      const user = await userHelper.user(databaseUser);

      if (!user.teams) {
        user.teams = [];
      }

      return user;
    }
  }

  async getUserByToken(token, date = new Date()) {
    const databaseUser = await this.db.users.findOne({
      'resetToken.token': token,
      'resetToken.validUntil': {
        $gt: date,
      },
    });

    if (databaseUser) {
      const encryptDecrypt = this.kmsHandler.getEncryptDecrypt();
      const userHelper = new UserHelper(encryptDecrypt);

      return await userHelper.user(databaseUser);
    }
  }

  async activateAccount(code, date = new Date()) {
    const {
      value,
      lastErrorObject: { n },
    } = await this.db.users.findOneAndUpdate(
      {
        'activationToken.token': code,
        'activationToken.validUntil': {
          $gt: date,
        },
      },
      {
        $set: { status: 'registered', isActive: 'yes' },
        $unset: {
          resetToken: 1,
          activationToken: 1,
        },
      },
      { projection: { status: 1 } },
    );

    return n === 1 ? value : undefined;
  }

  async setFields(subject, fields = {}) {
    const encryptDecrypt = this.kmsHandler.getEncryptDecrypt();
    const userHelper = new UserHelper(encryptDecrypt);

    const queryField = await userHelper.encrypt(subject.toLowerCase());

    const query = subject.includes('@') ? { lowerEmail: queryField } : { username: queryField };

    const {
      value,
      lastErrorObject: { n },
    } = await this.db.users.findOneAndUpdate(query, { $set: fields }, { projection: { password: 0 } });
    if (n == 1) {
      return await userHelper.user(value);
    }
  }

  async setFieldsForId(id, fields = {}) {
    const encryptDecrypt = this.kmsHandler.getEncryptDecrypt();
    const userHelper = new UserHelper(encryptDecrypt);

    const {
      value,
      lastErrorObject: { n },
    } = await this.db.users.findOneAndUpdate(
      { _id: new this.ObjectId(id) },
      { $set: fields },
      { projection: { password: 0 } },
    );
    if (n == 1) {
      return await userHelper.user(value);
    }
  }

  async unregister(id) {
    const encryptDecrypt = this.kmsHandler.getEncryptDecrypt();
    const userHelper = new UserHelper(encryptDecrypt);

    const {
      value,
      lastErrorObject: { n },
    } = await this.db.users.findOneAndUpdate(
      { _id: new this.ObjectId(id) },
      { $set: { status: 'pending' } },
      { projection: { _id: 1 } },
    );
    if (n == 1) {
      return await userHelper.user(value);
    }
  }

  async createUser(fields) {
    const encryptDecrypt = this.kmsHandler.getEncryptDecrypt();
    const userHelper = new UserHelper(encryptDecrypt);
    const encryptedUser = await userHelper.encryptedUser(fields);

    const { insertedId } = await this.db.users.insertOne(encryptedUser);
    return insertedId.toString();
  }

  async deleteUser(userId) {
    const deleteUser = this.db.users.deleteOne({
      _id: new this.ObjectId(userId),
    });
    const deleteTokens = this.deleteJSONWebTokensForUser(userId);

    /**
     * XXX: This is a terrible hack until we get foreign key constraint support
     * turned on with node-sqlite. As is this could leave junk around in the this.db.
     */
    return Promise.all([deleteTokens, deleteUser]);
  }
}

export { default as UserHelper } from './user-helper.js';
