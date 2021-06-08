import mongodb from 'mongodb';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import util from 'node:util';
import { logger } from '../logger.js';
import { KmsHandler } from './kms-handler.js';

const MongoClient = mongodb.MongoClient;

const readFileAsync = util.promisify(fs.readFile);

function hexOrObjectId(hexOrId) {
  if (hexOrId instanceof mongodb.ObjectID) {
    return hexOrId;
  }
  if (!hexOrId || hexOrId.length !== 24) {
    return hexOrId;
  }
  return mongodb.ObjectID.createFromHexString(hexOrId);
}

let dbx;
let _client;
let _kmsHandler;

function loadCAcert(name) {
  if (!name) {
    return [];
  }
  const dirname = process.cwd();
  const fullname = path.join(dirname, name);
  return readFileAsync(fullname).then(buffer => [buffer]);
}

const database_ = {
  init(dbg) {
    return Promise.resolve(loadCAcert(dbg.ca))
      .then(async ca => {
        const { url, database, csfle } = dbg;

        const options = {
          ...{
            // writeConcern: {
            //   w: 1,
            // },
            poolSize: 10,
            authMechanism: 'SCRAM-SHA-1',
            useNewUrlParser: true,
            useUnifiedTopology: true,
          },
          ...dbg.options,
        };

        const mongoClient = new MongoClient(url, options);
        const client = await mongoClient.connect();

        client.on('error', error => {
          logger.warn(`error: ${error && error.message}`);
        });

        _client = client;

        if (csfle) {
          const key = typeof csfle.masterKey === 'string' ? Buffer.from(csfle.masterKey, 'base64') : csfle.masterKey;

          _kmsHandler = new KmsHandler({
            kmsProviders: {
              local: {
                key,
              },
            },
            client,
            keyAltNames: csfle.keyAltNames,
          });

          await _kmsHandler.findOrCreateDataKey();
        }
        return client.db(database);
      })
      .then(database => {
        logger.info('Connected to database server.');

        dbx = database;
        return database;
      });
  },

  dispose() {
    if (_client) {
      _client.close().then(() => {
        dbx = undefined;
        _client = undefined;
      });
    }
  },

  get kmsHandler() {
    return _kmsHandler;
  },

  get client() {
    return _client;
  },

  toObjectId(hexOrId) {
    return hexOrObjectId(hexOrId);
  },

  newObjectId() {
    return new mongodb.ObjectID();
  },
};

export const database = new Proxy(database_, {
  get: function (object, property) {
    const databaseProperty = object[property] || dbx[property];
    return databaseProperty ? databaseProperty : dbx.collection(property);
  },
});
