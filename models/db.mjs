import fs from 'fs';
import mongodb from 'mongodb';
import path from 'path';
import util from 'util';
import { KmsHandler } from './kms-handler.mjs';

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

const db_ = {
  init(dbg) {
    return Promise.resolve(loadCAcert(dbg.ca))
      .then(async ca => {
        const { url, database, csfle } = dbg;

        const options = {
          ...{
            w: 1,
            poolSize: 10,
            authMechanism: 'SCRAM-SHA-1',
            useNewUrlParser: true,
            useUnifiedTopology: true,
          },
          ...dbg.options,
        };

        const mongoClient = new MongoClient(url, options);
        const client = await mongoClient.connect();

        _client = client;

        if (csfle) {
          const key =
            typeof csfle.masterKey === 'string'
              ? Buffer.from(csfle.masterKey, 'base64')
              : csfle.masterKey;

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
      .then(db => {
        console.log('Connected to database server.');
        db.on('reconnect', e => {
          console.log(`reconnect: ${e && e.message}`);
        });

        db.on('error', e => {
          console.log(`error: ${e && e.message}`);
        });
        dbx = db;
        return db;
      });
  },

  dispose() {
    if (_client) {
      _client.close().then(() => {
        dbx = null;
        _client = null;
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

export const db = new Proxy(db_, {
  get: function (obj, prop) {
    const dbProp = obj[prop] || dbx[prop];
    return dbProp ? dbProp : dbx.collection(prop);
  },
});
