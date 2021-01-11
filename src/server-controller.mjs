import compression from 'compression';
import Cookies from 'cookies';
import express from 'express';
import expressEnforcesSSL from 'express-enforces-ssl';
import fs from 'fs';
import helmet from 'helmet';
import http from 'http';
import https from 'https';
import path from 'path';
import favicon from 'serve-favicon';
import './express-async.mjs';
import { logger } from './logger.mjs';

const _defaultCspDirectives = {
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
};

const ServerController = {
  setup() {
    let expressServer = null;
    const app = express();

    Object.defineProperty(this, 'expressApp', {
      get() {
        return app;
      },
      enumerable: true,
      configurable: true,
    });

    Object.defineProperty(this, 'expressServer', {
      get() {
        return expressServer;
      },
      set(newValue) {
        expressServer = newValue;
      },
      enumerable: true,
      configurable: true,
    });

    return this;
  },

  stopServer() {
    return Promise.resolve(this.expressServer.close());
  },

  startServer({ port, sslPort }) {
    port = process.env.PORT || port;
    // As a failsafe use port 0 if the input isn't defined
    // this will result in a random port being assigned
    // See : https://nodejs.org/api/http.html for details
    if (
      typeof port === 'undefined' ||
      port === null ||
      isNaN(parseInt(port, 10))
    ) {
      port = 0;
    }
    const app = this.expressApp;

    const server = http.createServer(app).listen(port, () => {
      const serverPort = server.address().port;

      logger.info(`Express server listening on port ${serverPort}`);
    });

    this.expressServer = server;

    sslPort = process.env.SSLPORT || sslPort;
    if (sslPort) {
      const options = {
        key: fs.readFileSync('../localhost.key'),
        cert: fs.readFileSync('../localhost.crt'),
        requestCert: false,
        rejectUnauthorized: false,
      };

      if (
        typeof sslPort === 'undefined' ||
        sslPort === null ||
        isNaN(parseInt(sslPort, 10))
      ) {
        sslPort = 0;
      }
      const servers = https.createServer(options, app).listen(sslPort, () => {
        const serverPort = servers.address().port;

        logger.info(`Express https server listening on port ${serverPort}`);
      });

      this.expressServers = servers;
    }
  },
  async close() {
    await this.expressServer.close();
    if (this.expressServers) {
      await this.expressServers.close();
    }
  },

  setupExpress(options) {
    const app = this.expressApp;

    const { jsonErrors } = options;
    if (jsonErrors) {
      app.set('json errors', true);
    }

    // all environments;
    app.disable('x-powered-by');

    const viewpath = path.join(options.basepath || '', './srv/views');

    app.set('views', path.resolve(viewpath));
    const cors = options.cors;
    if (cors) {
      const allowCrossDomain = function (req, res, next) {
        res.header('Access-Control-Allow-Origin', cors);
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header(
          'Access-Control-Allow-Headers',
          'Content-Type,Authorization',
        );

        const method =
          req.method && req.method.toUpperCase && req.method.toUpperCase();

        if (method !== 'OPTIONS') {
          next();
        } else {
          res.statusCode = 204;
          res.end();
        }
      };

      app.use(allowCrossDomain);
    }

    if (app.get('env') !== 'development' && app.get('env') !== 'test') {
      app.use(compression());
    }

    if (process.env.NODE_ENV !== 'test') {
      const favpath = options.favpath || './public/favicon.ico';
      app.use(favicon(favpath));
    }

    app.use(Cookies.express());

    app.enable('trust proxy');

    if (app.get('env') !== 'development' && app.get('env') !== 'test') {
      app.use(expressEnforcesSSL());
    }

    const oneeightyDaysInMilliseconds = 15552000000;
    app.use(
      helmet.hsts({
        maxAge: oneeightyDaysInMilliseconds,
        includeSubDomains: true,
        force: true,
      }),
    );

    app.use(helmet.frameguard());
    app.use(helmet.xssFilter());
    app.use(helmet.noSniff());

    const directives = options.csp || _defaultCspDirectives;

    app.use(
      helmet.contentSecurityPolicy({
        directives,
      }),
    );

    app.locals.cacheBreaker = 'br34k-01';

    app.set('json spaces', 2);
  },
};
const instance = Object.create(ServerController).setup();
export default instance;
