import fs from 'node:fs';
import util from 'node:util';
import { ServerConfig } from './config/server-config.js';
import { database } from './index.js';
import { initLogger, logger } from './logger.js';
import serverController from './server-controller.js';

const program = {
  get server() {
    return this.server_;
  },
  async run(databaseSetup, routes) {
    try {
      const serverConfig = await new ServerConfig().config();

      const { csp, cors, PORT: port, SSLPORT: sslPort, logLevel = 'info', pidFile, listenOn, db } = serverConfig;

      // create a logger for non-http middleware
      initLogger({ level: logLevel });

      if (pidFile) {
        fs.writeFileSync(pidFile, String(process.pid));
      }

      const databaseConfig = clone(db);

      const fastify = serverController.setupExpress({
        csp,
        cors,
        logLevel,
        dbConfig: databaseConfig,
        dbSetup: databaseSetup,
      });

      // // await this.initDb(dbConfig, fastify);
      // await dbSetup(fastify);

      await this.setupRoutes(fastify, routes);
      serverController.startServer({
        port,
        sslPort,
        listenOn,
      });

      this.server_ = serverController.expressServer;
    } catch (error) {
      console.warn(util.inspect(error));
      throw new Error('Error: failed to initialise website');
    }
  },

  async shutdown() {
    serverController.stopServer().then(() => {
      database.dispose();
      logger.info('server is stopping');
    });
  },

  // async initDb(dbConfig, fastify) {
  //   if (!dbConfig) {
  //     throw Error('Error: no database info found');
  //   }
  //   const dbg = dbConfig;
  //   try {
  //     await db.init(dbg, {});
  //     await db.jsonwebtokens.createIndex(
  //       {
  //         keyId: 1,
  //       },
  //       {
  //         unique: true,
  //       },
  //     );
  //   } catch (error) {
  //     logger.warn(util.inspect(error));
  //     db.dispose();
  //     throw Error('Error: cannot connect to database');
  //   }
  // },

  async setupRoutes(fastify, routes) {
    await routes(fastify);

    // let maxAge = '5m';
    // pinoLogger && app.use(pinoLogger);

    // if (app.get('env') === 'development') {
    //   maxAge = '0';
    // }

    // app.use(express.urlencoded());

    // app.use(
    //   express.json({
    //     limit: '50mb',
    //   }),
    // );

    // // uncomment to add support for csrf token;
    // // app.use(csurf());

    // app.use('/', routes(maxAge));

    // respond to not found and errors as a last resort.
    // notfound(serverController);
  },
};

const pgm = Object.create(program);

export { pgm as program };

// ===
// Private functions
// ===

function clone(o) {
  return typeof o === 'object' && o !== null // only clone objects
    ? // eslint-disable-next-line unicorn/no-nested-ternary
      Array.isArray(o) // if cloning an array
      ? o.map(element => clone(element)) // clone each of its elements
      : // eslint-disable-next-line unicorn/no-array-reduce
        Object.keys(o).reduce(
          // otherwise reduce every key in the object
          (r, k) => ((r[k] = clone(o[k])), r),
          {}, // and save its cloned value into a new object
        )
    : o;
}
