import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import util from 'util';
import { ServerConfig } from './config/server-config.mjs';
import { db } from './index.mjs';
import { createLogger, initLogger, logger } from './logger.mjs';
import notfound from './notfoundroutes.mjs';
import serverController from './server-controller.mjs';
import fs from 'fs';
import pino from 'pino';

const expressOptions_ = {
  engine: {
    name: 'handlebars',
    options: {
      defaultLayout: 'basev2',
    },
  },
};

const program = {
  get server() {
    return this.server_;
  },
  async run(dbSetup, routes) {
    try {
      const serverConfig = await new ServerConfig().config();

      const {
        csp,
        cors,
        favpath,
        jsonErrors,
        PORT: port,
        SSLPORT: sslPort,
        logDestination,
        logLevel = 'info',
        httpLogLevel = logLevel,
        pidFile,
      } = serverConfig;

      // create a logger for non-http middleware
      initLogger({ level: logLevel });

      if (pidFile) {
        fs.writeFileSync(pidFile, String(process.pid));
      }

      // if have a log destination we create a separate logger so that web logs go there, but other logs/errors
      // go to stdout (which in production goes to the journal typically)
      const httpLogger = logDestination
        ? // create an http logger that will write to a file (if specified)
          // and which will support logRotate's HUP signal.
          createLogger({ level: httpLogLevel }, logDestination)
        : logger;

      const dbConfig = clone(serverConfig.db);

      await this.initDb(dbConfig);
      await dbSetup(db);

      const app = serverController.expressApp;

      const pinoMiddleware = await import('pino-http');
      const pinoLogger = pinoMiddleware['default']({
        logger: httpLogger,
      });

      serverController.setupExpress({
        ...expressOptions_,
        csp,
        cors,
        favpath,
        jsonErrors,
      });

      this.setupRoutes(app, routes, { pinoLogger });
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

  setupRoutes(app, routes, { pinoLogger }) {
    let maxAge = '5m';
    pinoLogger && app.use(pinoLogger);

    if (app.get('env') === 'development') {
      maxAge = '0';
    }

    app.use(
      bodyParser.urlencoded({
        extended: true,
      }),
    );

    app.use(
      bodyParser.json({
        limit: '50mb',
      }),
    );

    app.use(methodOverride());

    // uncomment to add support for csrf token;
    // app.use(csurf());

    app.use('/', routes(maxAge));

    // respond to not found and errors as a last resort.
    notfound(serverController);
  },
};
process.on('SIGTERM', () => {
  const finalLogger = pino.final(logger);
  finalLogger.info('shutdown started');

  serverController
    .stopServer()
    .then(() => {
      db.dispose();
      finalLogger.warn('process is stopping');

      process.exit(0);
    })
    .catch(() => process.exit(1));
});

const pgm = Object.create(program);

export { pgm as program, serverController };

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
