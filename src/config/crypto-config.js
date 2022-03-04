import config from 'config';

class Config {
  constructor(decrypt = value => value) {
    this.orig = config;
    Object.freeze(this.orig);

    const clone = o =>
      typeof o === 'object' && o !== null // only clone objects
        ? Array.isArray(o) // if cloning an array
          ? o.map(error => clone(error)) // clone each of its elements
          : cloneAll(o)
        : typeof o === 'string' && o.startsWith('!secret')
        ? decrypt(o.slice(8))
        : o;

    const cloneAll = o => {
      const ca = {};

      for (const key of Object.keys(o)) {
        ca[key] = clone(o[key]);
      }
      return ca;
    };

    this.config = clone(this.orig);
  }
}

export default Config;
