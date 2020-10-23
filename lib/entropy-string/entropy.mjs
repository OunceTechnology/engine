const _log2 = Math.log2;

const _totalOf = (numStrings, log2Risk) => {
  if (numStrings == 0) {
    return 0;
  }

  let N;
  if (numStrings < 1000) {
    N = _log2(numStrings) + _log2(numStrings - 1);
  } else {
    N = 2 * _log2(numStrings);
  }
  return N + log2Risk - 1;
};

const bits = (total, risk) => {
  if (total == 0) {
    return 0;
  }
  return _totalOf(total, _log2(risk));
};

export default {
  bits,
};
