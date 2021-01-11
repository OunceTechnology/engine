import assert from 'assert';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import ec from './ec-crypto.mjs';
import Database from './models/database.mjs';

const issuer = 'ounce.ac';

const ROLE_USER_TOKEN = 'user_token';

class JSONWebToken {
  /**
   * Verify a JWT by it's signature.
   *
   * @return {JSONWebToken|bool} false when invalid JSONWebToken when valid.
   */
  static async verifyJWT(sig) {
    const decoded = jwt.decode(sig, {
      complete: true,
    });

    if (!decoded || !decoded.header || !decoded.header.kid) {
      return false;
    }

    const { kid } = decoded.header;

    const tokenData = await Database.getJSONWebTokenByKeyId(kid);
    if (!tokenData) {
      return false;
    }
    const token = new JSONWebToken(tokenData);
    token.payload = token.verify(sig);
    if (token.payload) {
      return token;
    }

    return false;
  }

  /**
   * Issue a JWT token and store it in the database.
   *
   * @param {User} user to issue token for.
   * @return {string} the JWT token signature.
   */
  static async issueToken(user) {
    // const teams = (user.teams || []).map(({ id, role }) => [id, role]);

    // const payload = {
    //   sub: user._id,
    //   teams,
    //   role: user.role,
    // };

    const { sig, token } = await this.create(user._id);
    await Database.createJSONWebToken(token);
    return sig;
  }

  /**
   * Issue a JWT token for an OAuth2 client and store it in the
   * database.
   *
   * @param {ClientRegistry} client to issue token for.
   * @param {number} user user id associated with token
   * @param {{role: String, scope: String}} payload of token
   * @return {string} the JWT token signature.
   */
  static async issueOAuthToken(client, user, payload) {
    const { sig, token } = await this.create(
      user,
      Object.assign(
        {
          client_id: client.id,
        },
        payload,
      ),
    );
    await Database.createJSONWebToken(token);
    return sig;
  }

  /**
   * Remove a JWT token from the database by it's key id.
   *
   * @param {string} keyId of the record to remove.
   * @return bool true when a record was deleted.
   */
  static async revokeToken(keyId) {
    assert(typeof keyId === 'string');
    return Database.deleteJSONWebTokenByKeyId(keyId);
  }

  /**
   * @param number user id of the user to create a token for.
   * @return {Object} containing .sig (the jwt signature) and .token
   *  for storage in the database.
   */
  static async create(user, payload = { role: ROLE_USER_TOKEN }) {
    const pair = ec.generateKeyPair();

    const keyId = uuidv4();
    // const tunnelInfo = await Settings.getTunnelInfo();
    // const issuer = tunnelInfo.tunnelDomain;
    const options = {
      algorithm: ec.JWT_ALGORITHM,
      keyid: keyId,
    };
    if (issuer) {
      options.issuer = issuer;
    }

    const sig = jwt.sign(payload, pair.private, options);

    const token = {
      user,
      issuedAt: new Date(),
      publicKey: pair.public,
      keyId,
      payload,
    };

    return { sig, token };
  }

  constructor(obj) {
    const { user, issuedAt, publicKey, keyId } = obj;
    assert(typeof user === 'string');
    assert(issuedAt);
    assert(typeof publicKey === 'string');
    assert(typeof keyId === 'string');
    this.user = user;
    this.issuedAt = issuedAt;
    this.publicKey = publicKey;
    this.keyId = keyId;
    this.payload = {};
  }

  /**
   * Verify that the given JWT matches this token.
   *
   * @param string sig jwt token.
   * @returns {Object|false} jwt payload if signature matches.
   */
  verify(sig) {
    try {
      return jwt.verify(sig, this.publicKey, {
        algorithms: [ec.JWT_ALGORITHM],
      });
    } catch (err) {
      // If this error is thrown we know the token is invalid.
      if (err.name === 'JsonWebTokenError') {
        return false;
      }
      throw err;
    }
  }
}

export default JSONWebToken;
