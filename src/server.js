import fs from 'node:fs';
import process from 'node:process';
import util from 'node:util';
import { initLogger, logger } from './logger.js';
import { ServerController } from './server-controller.js';
import { ServerConfig } from './config/server-config.js';

export class Program {
  #config = {};

  async init(serverConfig) {
    try {
      this.#config = serverConfig ?? (await this.readServerConfig());
      const { helmet, cors, logLevel = 'info', pidFile, db } = this.#config;

      const credentials = await this.loadCredentials();

      const { auth, ...optionsNoAuth } = db.options ?? {};

      db.options = {
        auth: {
          username: credentials.dbUsername,
          password: credentials.dbPassword,
        },
        authSource: 'admin',
        ...optionsNoAuth,
      };

      db.csfle = {
        keyAltNames: credentials.dbKeyAltNames ?? this.keyAltNames,
        masterKey: credentials.dbMasterKey,
      };

      // create a logger for non-http middleware
      initLogger({ level: logLevel });

      if (pidFile) {
        fs.writeFileSync(pidFile, String(process.pid));
      }

      const databaseConfig = clone(db);

      this.fastify = await ServerController.createServer({
        helmet,
        cors,
        logLevel,
        dbConfig: databaseConfig,
      });
    } catch (error) {
      console.warn(util.inspect(error));
      throw new Error('Error: failed to initialise website');
    }
  }

  get keyAltNames() {
    return 'db-data-key';
  }

  async loadCredentials() {
    const dbPassword = process.env.DB_PASSWORD;
    const dbUsername = process.env.DB_USERNAME;
    const dbMasterKey = process.env.DB_MASTERKEY;
    const dbKeyAltNames = process.env.DB_KEYALTNAMES;

    return { dbPassword, dbUsername, dbMasterKey, dbKeyAltNames };
  }

  async readServerConfig() {
    return new ServerConfig().config();
  }

  async register(plugin, options) {
    await this.fastify.register(plugin, options);
  }

  async registerPlugins(plugins) {
    for await (const pluginOrConfig of plugins) {
      const { plugin, options } = pluginOrConfig.plugin
        ? pluginOrConfig
        : { plugin: pluginOrConfig };
      await this.fastify.register(plugin, options);
    }
  }

  startServer() {
    const { PORT: port, SSLPORT: sslPort, listenOn } = this.#config;
    ServerController.startServer(this.fastify, {
      port,
      sslPort,
      listenOn,
    });
  }

  async shutdown() {
    ServerController.stopServer().then(() => {
      // database.dispose();
      logger.info('server is stopping');
    });
  }
}

// ===
// Private functions
// ===

function clone(o) {
  return typeof o === 'object' && o !== null // only clone objects
    ? // eslint-disable-next-line unicorn/no-nested-ternary
      Array.isArray(o) // if cloning an array
      ? o.map(element => clone(element)) // clone each of its elements
      : cloneAll(o)
    : o;
}

function cloneAll(o) {
  const ca = {};

  for (const key of Object.keys(o)) {
    ca[key] = clone(o[key]);
  }
  return ca;
}
