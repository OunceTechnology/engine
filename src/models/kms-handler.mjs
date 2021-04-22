import mce from 'mongodb-client-encryption';
import { logger } from '../logger.mjs';

const ENC_DETERM = 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic';
const ENC_RANDOM = 'AEAD_AES_256_CBC_HMAC_SHA_512-Random';

const { ClientEncryption } = mce;

class KmsHandler {
  constructor({
    kmsProviders = null,
    keyDB = 'encryption',
    keyColl = '__keyVault',
    client,
    keyAltNames = 'my-data-key',
  }) {
    if (kmsProviders === null) {
      kmsProviders = {
        local: {
          key: KmsHandler.getMasterKey(),
        },
      };
    }
    this.kmsProviders = kmsProviders;
    this.keyDB = keyDB;
    this.keyColl = keyColl;
    this.keyVaultNamespace = `${keyDB}.${keyColl}`;

    this.keyAltNames = keyAltNames;

    this.client = client;
  }

  static getMasterKey() {
    const masterKey = process.env.MASTER_KEY;
    if (!masterKey) {
      throw new Error('MASTER_KEY not defined');
    }

    return Buffer.from(masterKey, 'base64');
  }

  async ensureUniqueIndexOnKeyVault() {
    try {
      await this.client
        .db(this.keyDB)
        .collection(this.keyColl)
        .createIndex('keyAltNames', {
          unique: true,
          partialFilterExpression: {
            keyAltNames: {
              $exists: true,
            },
          },
        });
    } catch (e) {
      logger.error(e);
      process.exit(1);
    }
  }

  async findOrCreateDataKey() {
    const encryption = new ClientEncryption(this.client, {
      keyVaultNamespace: this.keyVaultNamespace,
      kmsProviders: this.kmsProviders,
    });

    await this.ensureUniqueIndexOnKeyVault(this.client);

    let dataKey = await this.client
      .db(this.keyDB)
      .collection(this.keyColl)
      .findOne({ keyAltNames: { $in: [this.keyAltNames] } });

    if (dataKey === null) {
      dataKey = await encryption.createDataKey('local', {
        keyAltNames: [this.keyAltNames],
      });

      this.dataKeyId = dataKey;
    } else {
      this.dataKeyId = dataKey._id;
    }
  }

  getClientEncryption() {
    const clientEncryption = new ClientEncryption(this.client, {
      keyVaultNamespace: this.keyVaultNamespace,
      kmsProviders: this.kmsProviders,
    });

    return clientEncryption;
  }

  getEncryptDecrypt() {
    const clientEncryption = this.getClientEncryption();
    return {
      decrypt: val => clientEncryption.decrypt(val),
      encrypt: (value, keyId = this.dataKeyId, algorithm = ENC_DETERM) =>
        clientEncryption.encrypt(value, { keyId, algorithm }),
    };
  }

  getDecrypt() {
    const clientEncryption = this.getClientEncryption();
    return val => clientEncryption.decrypt(val);
  }

  async encrypt(
    clientEncryption,
    value,
    keyId = this.dataKeyId,
    algorithm = ENC_DETERM,
  ) {
    return clientEncryption.encrypt(value, { keyId, algorithm });
  }

  async decrypt(clientEncryption, value) {
    return clientEncryption.decrypt(value);
  }
}

export { KmsHandler, ENC_DETERM, ENC_RANDOM };
