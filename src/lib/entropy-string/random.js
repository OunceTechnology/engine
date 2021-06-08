import crypto from 'node:crypto';
import CharSet, { charSet32 } from './char-set.js';

const propertyMap = new WeakMap();

const BITS_PER_BYTE = 8;

export default class {
  constructor(argument) {
    let charSet;
    if (argument === undefined) {
      charSet = charSet32;
    } else if (argument instanceof CharSet) {
      charSet = argument;
    } else if (typeof argument === 'string' || argument instanceof String) {
      charSet = new CharSet(argument);
    } else {
      throw new TypeError('Invalid arg: must be either valid CharSet or valid chars');
    }
    const hideProperties = {
      charSet,
    };
    propertyMap.set(this, hideProperties);
  }

  smallID(charSet = propertyMap.get(this).charSet) {
    return this.string(29, charSet);
  }

  mediumID(charSet = propertyMap.get(this).charSet) {
    return this.string(69, charSet);
  }

  largeID(charSet = propertyMap.get(this).charSet) {
    return this.string(99, charSet);
  }

  sessionID(charSet = propertyMap.get(this).charSet) {
    return this.string(128, charSet);
  }

  token(charSet = propertyMap.get(this).charSet) {
    return this.string(256, charSet);
  }

  string(entropyBits, charSet = propertyMap.get(this).charSet) {
    const bytesNeeded = charSet.bytesNeeded(entropyBits);
    return this.stringWithBytes(entropyBits, _cryptoBytes(bytesNeeded), charSet);
  }

  stringRandom(entropyBits, charSet = propertyMap.get(this).charSet) {
    const bytesNeeded = charSet.bytesNeeded(entropyBits);
    return this.stringWithBytes(entropyBits, _randomBytes(bytesNeeded), charSet);
  }

  stringWithBytes(entropyBits, bytes, charSet = propertyMap.get(this).charSet) {
    return _stringWithBytes(entropyBits, bytes, charSet);
  }

  bytesNeeded(entropyBits, charSet = propertyMap.get(this).charSet) {
    return charSet.bytesNeeded(entropyBits);
  }

  chars() {
    return propertyMap.get(this).charSet.chars();
  }

  use(charSet) {
    if (!(charSet instanceof CharSet)) {
      throw new TypeError('Invalid CharSet');
    }
    propertyMap.get(this).charSet = charSet;
  }

  useChars(chars) {
    if (!(typeof chars === 'string' || chars instanceof String)) {
      throw new TypeError('Invalid chars: Must be string');
    }
    this.use(new CharSet(chars));
  }
}

const _stringWithBytes = (entropyBits, bytes, charSet) => {
  if (entropyBits <= 0) {
    return '';
  }

  const bitsPerChar = charSet.getBitsPerChar();
  const count = Math.ceil(entropyBits / bitsPerChar);
  if (count <= 0) {
    return '';
  }

  const need = Math.ceil(count * (bitsPerChar / BITS_PER_BYTE));
  if (bytes.length < need) {
    throw new Error('Insufficient bytes: need ' + need + ' and got ' + bytes.length);
  }

  const charsPerChunk = charSet.getCharsPerChunk();
  const chunks = Math.floor(count / charsPerChunk);
  const partials = count % charsPerChunk;

  const ndxFunction = charSet.getNdxFn();
  const chars = charSet.getChars();

  let string = '';
  for (let chunk = 0; chunk < chunks; chunk++) {
    for (let slice = 0; slice < charsPerChunk; slice++) {
      const ndx = ndxFunction(chunk, slice, bytes);
      string += chars[ndx];
    }
  }
  for (let slice = 0; slice < partials; slice++) {
    const ndx = ndxFunction(chunks, slice, bytes);
    string += chars[ndx];
  }
  return string;
};

const _cryptoBytes = count => {
  return crypto.randomBytes(count);
};

const _randomBytes = count => {
  const BYTES_USED_PER_RANDOM_CALL = 6;
  const randCount = Math.ceil(count / BYTES_USED_PER_RANDOM_CALL);

  const buffer = new Uint8Array(count);
  const dataView = new DataView(new ArrayBuffer(BITS_PER_BYTE));
  for (let rNumber = 0; rNumber < randCount; rNumber++) {
    dataView.setFloat64(0, Math.random());
    for (let n = 0; n < BYTES_USED_PER_RANDOM_CALL; n++) {
      const fByteNumber = _endianByteNumber[n];
      const bByteNumber = rNumber * BYTES_USED_PER_RANDOM_CALL + n;
      if (bByteNumber < count) {
        buffer[bByteNumber] = dataView.getUint8(fByteNumber);
      }
    }
  }
  return buffer;
};

const _endianByteNumber = (() => {
  const buf32 = new Uint32Array(1);
  const buf8 = new Uint8Array(buf32.buffer);
  buf32[0] = 0xFF;
  return buf8[0] === 0xFF ? [2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 6, 7];
})();
