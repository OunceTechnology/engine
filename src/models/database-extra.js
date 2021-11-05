import { databaseTokens } from './database-tokens.js';
import { database, databaseUsers } from './database-users.js';

const Database = {
  ...databaseUsers,
  ...databaseTokens,

  async deleteEverything() {
    const collections = await database
      .listCollections({}, { nameOnly: true })
      .toArray();

    return Promise.all(
      collections.map(({ name }) => database.dropCollection(name)),
    );
  },
};

export default Database;

export { databaseTeams as Teams } from './database-teams.js';
