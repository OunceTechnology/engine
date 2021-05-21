import fs from 'fs';
import util from 'util';
import { routes } from '../routes.js';
import { ServerConfig } from './config/server-config.js';
import { db } from './index.js';
import { initLogger, logger } from './logger.js';
import serverController from './server-controller.js';

const program = {
  get server() {
    return this.server_;
  },
  async run(dbSetup, routes) {
    try {
      const serverConfig = await new ServerConfig().config();

      const { csp, cors, PORT: port, SSLPORT: sslPort, logLevel = 'info', pidFile } = serverConfig;

      // create a logger for non-http middleware
      initLogger({ level: logLevel });

      if (pidFile) {
        fs.writeFileSync(pidFile, String(process.pid));
      }

      const dbConfig = clone(serverConfig.db);

      await this.initDb(dbConfig);
      await dbSetup(db);

      const fastify = serverController.setupExpress({
        csp,
        cors,
        logLevel,
        dbConfig,
      });

      await this.setupRoutes(fastify);
      serverController.startServer({
        port,
        sslPort,
      });

      this.server_ = serverController.expressServer;
    } catch (e) {
      console.warn(util.inspect(e));
      throw new Error('Error: failed to initialise website');
    }
  },

  async shutdown() {
    serverController.stopServer().then(() => {
      db.dispose();
      logger.info('server is stopping');
    });
  },

  async initDb(dbConfig) {
    if (!dbConfig) {
      throw Error('Error: no database info found');
    }
    const dbg = dbConfig;
    try {
      await db.init(dbg, {});
      await db.jsonwebtokens.createIndex(
        {
          keyId: 1,
        },
        {
          unique: true,
        },
      );
    } catch (error) {
      logger.warn(util.inspect(error));
      db.dispose();
      throw Error('Error: cannot connect to database');
    }
  },

  async setupRoutes(fastify) {
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
    ? Array.isArray(o) // if cloning an array
      ? o.map(e => clone(e)) // clone each of its elements
      : Object.keys(o).reduce(
          // otherwise reduce every key in the object
          (r, k) => ((r[k] = clone(o[k])), r),
          {}, // and save its cloned value into a new object
        )
    : o;
}
