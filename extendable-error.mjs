class ExtendableError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }

  get code() {
    return 500;
  }

  get stack() {
    if (!this.stack) {
      if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(this, this.constructor);
      } else {
        this.stack = new Error(this.message).stack;
      }
    }
    return this.stack;
  }
}

class ConflictError extends ExtendableError {
  get code() {
    return 409;
  }
}

class ValidationError extends ExtendableError {
  constructor(key, ...params) {
    if (params.length > 0) {
      super(...params);
      this.key_ = key;
    } else {
      super(key);
    }
  }

  get key() {
    return this.key_;
  }

  get code() {
    return 422;
  }
}

class NotAcceptableError extends ExtendableError {
  get code() {
    return 406;
  }
}

class NotFoundError extends ExtendableError {
  get code() {
    return 404;
  }
}

export {
  ConflictError,
  ValidationError,
  NotAcceptableError,
  NotFoundError,
  ExtendableError,
};
