const _log2 = Math.log2;

const _totalOf = (numberStrings, log2Risk) => {
  if (numberStrings == 0) {
    return 0;
  }

  let N;
  N = numberStrings < 1000 ? _log2(numberStrings) + _log2(numberStrings - 1) : 2 * _log2(numberStrings);
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
