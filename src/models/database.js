import { databaseTeams } from './database-teams.js';
import { databaseTokens } from './database-tokens.js';
import { databaseUsers, db } from './database-users.js';

const Database = {
  ...databaseUsers,
  ...databaseTokens,

  async deleteEverything() {
    const collections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();

    return Promise.all(collections.map(({ name }) => db.dropCollection(name)));
  },
};

export default Database;
export { databaseTeams as Teams };
