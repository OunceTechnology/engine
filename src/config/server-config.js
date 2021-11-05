import appRoot from 'app-root-path';
import { Buffer } from 'node:buffer';
import fsc from 'node:fs';
import process from 'node:process';
import aesUtil from './aes-util.js';
import CryptoConfig from './crypto-config.js';

const testBase64_ = /^[\d+/=A-Za-z]+\s?$/;
const fs = fsc.promises;

const loadKeyFromEnvironment = () => {
  const keyString = process.env.API_KEY;
  if (!keyString) {
    return void 0;
  }
  if (!testBase64_.test(keyString)) {
    throw new Error(`Invalid format: API_KEY = ${keyString}`);
  }

  const key = Buffer.from(keyString, 'base64');

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
    this.apiKey = await (loadKeyFromEnvironment() ?? this.loadKeyFromFile());
    return new CryptoConfig(value => aesUtil.decrypt(value, this.apiKey))
      .config;
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
