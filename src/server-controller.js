import Fastify from 'fastify';
import fastifyFormbody from 'fastify-formbody';
import fastifyHelmet from 'fastify-helmet';
import fastifyMongodb from 'fastify-mongodb';
import fastifySensible from 'fastify-sensible';
import mongodb from 'mongodb';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { engineDatabasePlugin, KmsHandler } from './models/index.js';

const { MongoClient } = mongodb;

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

const ServerController = {
  setup() {
    return this;
  },

  stopServer() {
    return Promise.resolve(this.expressServer.close());
  },

  startServer({ port, listenOn }) {
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

    const fastify = this.fastify;

    fastify.listen(port, listenOn, function (error, address) {
      if (error) {
        fastify.log.error(error);
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1);
      }
      fastify.log.warn(`server listening on ${address}`);
    });
  },
  async close() {
    await this.expressServer.close();
    if (this.expressServers) {
      await this.expressServers.close();
    }
  },

  async setupExpress({
    helmet = _defaultHelmetDirectives,
    logLevel,
    dbConfig,
    dbSetup,
  }) {
    // eslint-disable-next-line new-cap
    const fastify = Fastify({ trustProxy: true, logger: { level: logLevel } });

    fastify.register(fastifySensible);

    fastify.register(fastifyFormbody);

    if (helmet.contentSecurityPolicy.optionsDefault == undefined) {
      helmet.contentSecurityPolicy.optionsDefault = true;
    }

    const helmetOptions = {
      dnsPrefetchControl: false,
      expectCt: false,
      ...helmet,
    };

    fastify.register(fastifyHelmet, helmetOptions);
    const { url, database, csfle, options } = dbConfig;

    // note: pass in client as letting fastifyMongodb create it
    // fails since v4.0.0
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ...options,
    });
    fastify.addHook('onClose', () => client.close());

    fastify
      .register(fastifyMongodb, { url, client })
      .register(async (fastify, options, next) => {
        const client = fastify.mongo.client;
        const database_ = client.db(database);

        const database__ = new Proxy(database_, {
          get: function (object, property) {
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
        next();
      });

    fastify
      .register(engineDatabasePlugin, {})
      .register(async (instance, options, next) => {
        await dbSetup(instance);
        next();
      });

    this.fastify = fastify;

    return fastify;

    // const cors = options.cors;
    // if (cors) {
    //   const allowCrossDomain = function (req, res, next) {
    //     res.header('Access-Control-Allow-Origin', cors);
    //     res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    //     res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    //     const method = req.method && req.method.toUpperCase && req.method.toUpperCase();

    //     if (method !== 'OPTIONS') {
    //       next();
    //     } else {
    //       res.statusCode = 204;
    //       res.end();
    //     }
    //   };

    //   app.use(allowCrossDomain);
    // }
  },
};
const instance = Object.create(ServerController).setup();
export default instance;
