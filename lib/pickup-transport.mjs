import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

// expose to the world
export default function(options) {
  return new PickupTransport(options);
}

class PickupTransport {
  constructor(options) {
    options = options || {};
    this.options = options;
    this.options.directory = options.directory || os.tmpdir();
    this.name = 'Pickup';
    this.version = '1.0';
  }
  send(mail, callback) {
    // Pickup strips this header line by itself
    mail.message.keepBcc = true;
    let callbackSent = false;
    const filename =
      ((mail.message.getHeader('message-id') || '').replace(
        /[^a-z0-9\-_.@]/g,
        '',
      ) || crypto.randomBytes(10).toString('hex')) + '.eml'; // eslint-disable-line prefer-template
    const target = path.join(this.options.directory, filename);
    const output = fs.createWriteStream(target);
    const input = mail.message.createReadStream();
    const _onError = function(err) {
      if (callbackSent) {
        return;
      }
      callbackSent = true;
      callback(err);
    };
    input.on('error', _onError);
    input.on('end', function() {
      if (callbackSent) {
        return;
      }
      callbackSent = true;
      callback(null, {
        envelope: mail.data.envelope || mail.message.getEnvelope(),
        messageId: mail.message.getHeader('message-id'),
        path: target,
      });
    });
    output.on('error', _onError);
    input.pipe(output);
  }
}
