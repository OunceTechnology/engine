import crypto from 'crypto';
import util from 'util';

const algorithm_ = 'aes-256-gcm';

const aesUtil = {
  encrypt(text, key, encoding = 'utf8') {
    if (typeof key === 'string') {
      key = Buffer.from(key, 'base64');
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(algorithm_, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(text, encoding),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  },

  decrypt(data, key, encoding = 'utf8') {
    try {
      if (typeof key === 'string') {
        key = Buffer.from(key, 'base64');
      }
      const bData = Buffer.from(data, 'base64');
      const iv = bData.slice(0, 12);
      const authTag = bData.slice(12, 28);
      const decipher = crypto.createDecipheriv(algorithm_, key, iv);
      decipher.setAuthTag(authTag);
      return (
        decipher.update(bData.slice(28), 'binary', encoding) +
        decipher.final(encoding)
      );
    } catch (e) {
      console.warn(util.inspect(e));
    }

    return null;
  },
};

export default aesUtil;
