import Layer from 'express/lib/router/layer.js';

const Promise = global.Promise;

/* eslint camelcase:0 */

/**
 * "fixture" express regarding promises. If a piece of middleware returns a promise,
 * then errors must actually be given to next.
 *
 * We could also use the suffix `Async` to make new ones in addition to the existing functions.
 * That has a big disadvantage
 * because the api can be approached in different ways.
 */

const { handle_request, handle_error } = Layer.prototype;

Layer.prototype.handle_request = function(...args) {
  // This only happens once when the router is evaluated for the first time against a request.
  this.handle = wrapHandler(this.handle);

  this.handle_request = handle_request; // This restores the original prototype for the current object.
  return this.handle_request(...args);
};

Layer.prototype.handle_error = function(...args) {
  this.handle = wrapHandler(this.handle);
  this.handle_error = handle_error;
  return this.handle_error(...args);
};

function wrapHandler(fn) {
  if (fn.length > 3) {
    return (error, req, res, next) => {
      Promise.resolve(fn(error, req, res, next)).catch(next);
    };
  }
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
