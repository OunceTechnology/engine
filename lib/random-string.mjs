import { Entropy, Random } from './entropy-string/index.mjs';

let _instance;

const _random = {
  setup(total = 1e6, risk = 1e9) {
    this.random = new Random();
    this.bits = Entropy.bits(total, risk);
    return this;
  },
  string() {
    return this.random.string(this.bits);
  },
};

const RandomString = {
  init(total, risk) {
    _instance = Object.create(_random).setup(total, risk);
  },

  string() {
    if (!_instance) {
      RandomString.init();
    }
    return _instance.string();
  },
};

export default RandomString;
