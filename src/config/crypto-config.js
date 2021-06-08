import config from 'config';

class Config {
  constructor(decrypt = value => value) {
    this.orig = config;
    Object.freeze(this.orig);

    const clone = o =>
      typeof o === 'object' && o !== null // only clone objects
        ? (Array.isArray(o) // if cloning an array
          ? o.map(error => clone(error)) // clone each of its elements
          // eslint-disable-next-line unicorn/no-array-reduce
          : Object.keys(o).reduce(
              // otherwise reduce every key in the object
              (r, k) => ((r[k] = clone(o[k])), r),
              {}, // and save its cloned value into a new object
            ))
        : (typeof o === 'string' && o.startsWith('!secret')
        ? decrypt(o.slice(8))
        : o);

    this.config = clone(this.orig);
  }
}

export default Config;
