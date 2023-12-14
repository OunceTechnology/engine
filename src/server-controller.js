import Fastify from 'fastify';
import fastifyFormbody from '@fastify/formbody';
import fastifyHelmet from '@fastify/helmet';
import engineMongodb from './models/engine-mongodb.js';
import fastifySensible from '@fastify/sensible';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { engineDatabasePlugin, KmsHandler } from './models/index.js';

const _defaultHelmetDirectives = {
  optionsDefault: true,
  contentSecurityPolicy: {
    defaultSrc: [`'self'`],
    scriptSrc: [
      `'self'`,
      `'unsafe-inline'`,
      `'unsafe-eval'`,
      '*.ounce.ac',
      'ajax.googleapis.com',
      'www.google-analytics.com',
    ],
    frameSrc: ['www.youtube.com'],
    fontSrc: [`*`],
    imgSrc: [`*`, `blob:`, `data:`],
    mediaSrc: [`*`, `blob:`, `data:`],
    styleSrc: [`'self'`, `'unsafe-inline'`],
  },
};

export const ServerController = {
  startServer(fastify, { port, listenOn }) {
    port = process.env.PORT || port;
    // As a failsafe use port 0 if the input isn't defined
    // this will result in a random port being assigned
    // See : https://nodejs.org/api/http.html for details
    if (
      typeof port === 'undefined' ||
      port === null ||
      Number.isNaN(Number.parseInt(port, 10))
    ) {
      port = 0;
    }

    const fastifyOptions = { port };

    if (listenOn !== undefined) {
      fastifyOptions.host = listenOn;
    }

    fastify.listen(fastifyOptions, function (error, address) {
      if (error) {
        fastify.log.error(error);
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1);
      }
      fastify.log.warn(`server listening on ${address}`);
    });
  },

  async createServer({
    helmet = _defaultHelmetDirectives,
    logLevel,
    dbConfig,
  }) {
    // eslint-disable-next-line new-cap
    const fastify = Fastify({ trustProxy: true, logger: { level: logLevel } });

    await fastify.register(fastifySensible);

    await fastify.register(fastifyFormbody);

    if (helmet.contentSecurityPolicy.optionsDefault == undefined) {
      helmet.contentSecurityPolicy.optionsDefault = true;
    }

    const helmetOptions = {
      dnsPrefetchControl: false,
      expectCt: false,
      ...helmet,
    };

    await fastify.register(fastifyHelmet, helmetOptions);
    const { url, database, csfle, options } = dbConfig;

    await fastify.register(engineMongodb, { url, ...options });

    await fastify.register(async (fastify, _) => {
      const client = fastify.mongo.client;
      const database_ = client.db(database);

      const database__ = new Proxy(database_, {
        get: (object, property) => {
          const databaseProperty = object[property] || database_[property];
          return databaseProperty
            ? databaseProperty
            : database_.collection(property);
        },
      });
      fastify.mongo.db = database__;

      if (csfle) {
        const key =
          typeof csfle.masterKey === 'string'
            ? Buffer.from(csfle.masterKey, 'base64')
            : csfle.masterKey;

        const _kmsHandler = new KmsHandler({
          kmsProviders: {
            local: {
              key,
            },
          },
          client,
          keyAltNames: csfle.keyAltNames,
        });

        await _kmsHandler.findOrCreateDataKey();

        fastify.mongo.kmsHandler = _kmsHandler;
      }
    });

    await fastify.register(engineDatabasePlugin, {});

    return fastify;
  },
};
