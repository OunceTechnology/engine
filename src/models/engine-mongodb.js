import fp from 'fastify-plugin';
import { ObjectId, MongoClient } from 'mongodb';

function decorateFastifyInstance(fastify, client, options) {
  const name = options.name;

  const mongo = {
    client,
    ObjectId,
  };
  if (name) {
    if (!fastify.mongo) {
      fastify.decorate('mongo', mongo);
    }
    if (fastify.mongo[name]) {
      throw new Error('Connection name already registered: ' + name);
    }

    fastify.mongo[name] = mongo;
  } else {
    if (fastify.mongo) {
      throw new Error('engine-mongodb has already registered');
    }
  }

  if (!fastify.mongo) {
    fastify.decorate('mongo', mongo);
  }
}

async function engineMongodb(fastify, options) {
  options = Object.assign(
    {
      serverSelectionTimeoutMS: 7500,
    },
    options,
  );
  const { name, url, ...options_ } = options;

  if (!url) {
    throw new Error('`url` parameter is mandatory ');
  }

  const client = await MongoClient.connect(url, options_);

  await client.connect();

  fastify.addHook('onClose', () => client.close());

  if (client) {
    decorateFastifyInstance(fastify, client, {
      name,
    });
  } else {
    throw new Error('`client` parameter is mandatory');
  }
}

export default fp(engineMongodb, { fastify: '5.x', name: '@ounce/mongodb' });
