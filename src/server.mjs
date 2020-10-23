import bodyParser from 'body-parser';
import { ServerConfig } from './config/server-config.mjs';
import methodOverride from 'method-override';
import logger from 'morgan';
import dbSetup from '../dbSetup.mjs';
import { routes } from '../routes.mjs';
import { db } from './index.mjs';
import notfound from './notfoundroutes.mjs';
import serverController from './server-controller.mjs';

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
  async run() {
    try {
      const serverConfig = await new ServerConfig().config();

      const dbConfig = clone(serverConfig.db);

      await this.initDb(dbConfig);
      await dbSetup(db);

      const app = serverController.expressApp;

      const {
        csp,
        cors,
        favpath,
        jsonErrors,
        PORT: port,
        SSLPORT: sslPort,
      } = serverConfig;

      serverController.setupExpress({
        ...expressOptions_,
        csp,
        cors,
        favpath,
        jsonErrors,
      });

      this.setupRoutes(app);
      serverController.startServer({
        port,
        sslPort,
      });

      this.server_ = serverController.expressServer;
    } catch (e) {
      console.dir(e);
      throw new Error('Error: failed to initialise website');
    }
  },

  async shutdown() {
    serverController.stopServer().then(() => {
      db.dispose();
      console.log('server is stopping');
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
      console.dir(error);
      db.dispose();
      throw Error('Error: cannot connect to database');
    }
  },

  setupRoutes(app) {
    let maxAge = '5m';
    if (app.get('env') === 'development') {
      maxAge = '0';
      app.use(logger('dev'));
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
  console.log('shutdown started');

  serverController
    .stopServer()
    .then(() => {
      db.dispose();
      console.log('process is stopping');

      process.exit(0);
    })
    .catch(() => process.exit(1));
});

const pgm = Object.create(program);
// make it all happen
// const serverStartup = new Promise(resolve => {
//   pgm
//     .run()
//     .then(() => resolve())
//     .catch(e => {
//       console.dir(e);
//       console.error('Error: failed to start website');
//     });
// });

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
