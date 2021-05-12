import appRoot from 'app-root-path';
import fsc from 'fs';
import aesUtil from './aes-util.js';
import CryptoConfig from './crypto-config.js';

const testBase64_ = /^[0-9a-zA-Z/+=]+[\s]?$/;
const fs = fsc.promises;

const loadKeyFromEnv = () => {
  const keyStr = process.env.API_KEY;
  if (!keyStr) {
    return void 0;
  }
  if (!testBase64_.test(keyStr)) {
    throw new Error(`Invalid format: API_KEY = ${keyStr}`);
  }

  const key = Buffer.from(keyStr, 'base64');

  if (key.length !== 32) {
    throw new Error('Wrong key size');
  }

  return key;
};

export class ServerConfig {
  constructor({ keyFile } = {}) {
    this.keyFile = keyFile ?? `${appRoot.path}/config/credentials.key`;
  }

  async config() {
    this.apiKey = await (loadKeyFromEnv() ?? this.loadKeyFromFile());
    return new CryptoConfig(val => aesUtil.decrypt(val, this.apiKey)).config;
  }

  async loadKeyFromFile() {
    const buffer = await fs.readFile(this.keyFile);
    if (!testBase64_.test(buffer.toString('ascii'))) {
      throw new Error(`Invalid format: ${this.keyFile}`);
    }

    const key = Buffer.from(buffer.toString('ascii'), 'base64');

    if (key.length !== 32) {
      throw new Error('Wrong key size');
    }

    return key;
  }
}
