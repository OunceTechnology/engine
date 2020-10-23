import { db } from './db.mjs';

export const databaseTokens = {
  async createJSONWebToken(token) {
    const { keyId, user, publicKey, issuedAt, payload } = token;

    const { insertedId } = await db.jsonwebtokens.insertOne({
      keyId,
      user,
      issuedAt,
      publicKey,
      payload: JSON.stringify(payload),
    });

    return insertedId;
  },

  getJSONWebTokenByKeyId(keyId) {
    return db.jsonwebtokens.findOne({ keyId });
  },

  getJSONWebTokensByUser: function (userId) {
    return db.jsonwebtokens.find({ user: userId }).toArray();
  },

  deleteJSONWebTokenByKeyId: async function (keyId) {
    const { result: deleteResult } = await db.jsonwebtokens.deleteOne({
      keyId,
    });

    return deleteResult.ok && deleteResult.n === 1;
  },

  deleteJSONWebTokensForUser(userId) {
    return db.jsonwebtokens.deleteMany({ user: userId });
  },
};
