import lcm from './lcm.js';

const propertyMap = new WeakMap();
const BITS_PER_BYTE = 8;

export default class CharSet {
  constructor(chars) {
    if (!(typeof chars === 'string' || chars instanceof String)) {
      throw new TypeError('Invalid chars: Must be string');
    }
    const length = chars.length;
    if (![2, 4, 8, 16, 32, 64].includes(length)) {
      throw new Error('Invalid char count: must be one of 2,4,8,16,32,64');
    }
    const bitsPerChar = Math.floor(Math.log2(length));
    // Ensure no repeated characters
    for (let index = 0; index < length; index++) {
      const c = chars.charAt(index);
      for (let index_ = index + 1; index_ < length; index_++) {
        if (c === chars.charAt(index_)) {
          throw new Error('Characters not unique');
        }
      }
    }
    const privProperties = {
      chars,
      bitsPerChar,
      length,
      ndxFn: _ndxFunction(bitsPerChar),
      charsPerChunk: lcm(bitsPerChar, BITS_PER_BYTE) / bitsPerChar,
    };
    propertyMap.set(this, privProperties);
  }

  getChars() {
    return propertyMap.get(this).chars;
  }

  getBitsPerChar() {
    return propertyMap.get(this).bitsPerChar;
  }

  getNdxFn() {
    return propertyMap.get(this).ndxFn;
  }

  getCharsPerChunk() {
    return propertyMap.get(this).charsPerChunk;
  }

  length() {
    return propertyMap.get(this).length;
  }

  bytesNeeded(entropyBits) {
    const count = Math.ceil(entropyBits / this.bitsPerChar());
    return Math.ceil((count * this.bitsPerChar()) / BITS_PER_BYTE);
  }

  // Aliases
  chars() {
    return this.getChars();
  }
  ndxFn() {
    return this.getNdxFn();
  }
  bitsPerChar() {
    return this.getBitsPerChar();
  }
}

const _ndxFunction = bitsPerChar => {
  // If BITS_PER_BYTEs is a multiple of bitsPerChar, we can slice off an integer number
  // of chars per byte.
  if (lcm(bitsPerChar, BITS_PER_BYTE) === BITS_PER_BYTE) {
    return function (chunk, slice, bytes) {
      const lShift = bitsPerChar;
      const rShift = BITS_PER_BYTE - bitsPerChar;
      return ((bytes[chunk] << (lShift * slice)) & 0xFF) >> rShift;
    };
  }

  // Otherwise, while slicing off bits per char, we will possibly straddle a couple
  // of bytes, so a bit more work is involved
  const slicesPerChunk = lcm(bitsPerChar, BITS_PER_BYTE) / BITS_PER_BYTE;
  return function (chunk, slice, bytes) {
    const bNumber = chunk * slicesPerChunk;

    const offset = (slice * bitsPerChar) / BITS_PER_BYTE;
    const lOffset = Math.floor(offset);
    const rOffset = Math.ceil(offset);

    const rShift = BITS_PER_BYTE - bitsPerChar;
    const lShift = (slice * bitsPerChar) % BITS_PER_BYTE;

    let ndx = ((bytes[bNumber + lOffset] << lShift) & 0xFF) >> rShift;

    const rShiftIt = ((rOffset + 1) * BITS_PER_BYTE - (slice + 1) * bitsPerChar) % BITS_PER_BYTE;
    if (rShift < rShiftIt) {
      ndx += bytes[bNumber + rOffset] >> rShiftIt;
    }
    return ndx;
  };
};

export const charSet64 = new CharSet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_');
export const charSet32 = new CharSet('2346789bdfghjmnpqrtBDFGHJLMNPQRT');
export const charSet16 = new CharSet('0123456789abcdef');
export const charSet8 = new CharSet('01234567');
export const charSet4 = new CharSet('ATCG');
export const charSet2 = new CharSet('01');
