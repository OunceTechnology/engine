import { databaseTeams } from './database-teams.mjs';
import { databaseTokens } from './database-tokens.mjs';
import { databaseUsers, db } from './database-users.mjs';

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
