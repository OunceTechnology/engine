class UserHelper {
  static create(kmsHandler) {
    const encryptDecrypt = kmsHandler.getEncryptDecrypt();
    const userHelper = new UserHelper(encryptDecrypt);
    return userHelper;
  }

  constructor({ decrypt = value => value, encrypt = async value => value }) {
    this.decryptFn = decrypt;
    this.encryptFn = encrypt;
  }

  async encrypt(value) {
    return value === void 0 ? value : value.subType === 6 ? value : this.encryptFn(value);
  }

  async decrypt(value) {
    return value === void 0 ? value : value.sub_type === 6 ? this.decryptFn(value) : value;
  }

  async encryptedUser({ username, name: { first = '', last = '' } = {}, email, lowerEmail, ...user }) {
    const encoded = {
      ...user,
      username: await this.encrypt(username),
      name: {
        first: await this.encrypt(first),
        last: await this.encrypt(last),
      },
    };

    if (email) {
      encoded.email = await this.encrypt(email);
    }

    if (lowerEmail || email) {
      encoded.lowerEmail = await this.encrypt(lowerEmail ?? email);
    }

    return encoded;
  }

  async user({ _id, username, name: { first = '', last = '' } = {}, email = '', lowerEmail, ...user }) {
    const decrypted = await this.decrypt(lowerEmail ?? email);

    const decoded = {
      _id: _id?.toString(),
      ...user,
      username: await this.decrypt(username),
      email: await this.decrypt(email),
      lowerEmail: decrypted.toLowerCase(),
      name: {
        first: await this.decrypt(first),
        last: await this.decrypt(last),
      },
    };

    return decoded;
  }
}

export default UserHelper;
