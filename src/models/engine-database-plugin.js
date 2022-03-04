import fp from 'fastify-plugin';
import { Teams } from './database-teams.js';
import { Users } from './database-users.js';

export default fp((instance, _, next) => {
  const {
    mongo: { db, ObjectId, kmsHandler },
  } = instance;

  const models = {};
  instance.decorate('models', models);

  models.teams = new Teams(db, ObjectId);
  models.users = new Users(db, ObjectId, kmsHandler);
  next();
});
