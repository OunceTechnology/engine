export class Tokens {
  constructor(db, ObjectId) {
    this.db = db;
    this.ObjectId = ObjectId;
  }
  async createJSONWebToken(token) {
    const { keyId, user, publicKey, issuedAt, payload } = token;

    const { insertedId } = await this.db.jsonwebtokens.insertOne({
      keyId,
      user,
      issuedAt,
      publicKey,
      payload: JSON.stringify(payload),
    });

    return insertedId;
  }

  getJSONWebTokenByKeyId(keyId) {
    return this.db.jsonwebtokens.findOne({ keyId });
  }

  getJSONWebTokensByUser(userId) {
    return this.db.jsonwebtokens.find({ user: userId }).toArray();
  }

  async deleteJSONWebTokenByKeyId(keyId) {
    const { result: deleteResult } = await this.db.jsonwebtokens.deleteOne({
      keyId,
    });

    return deleteResult.ok && deleteResult.n === 1;
  }

  deleteJSONWebTokensForUser(userId) {
    return this.db.jsonwebtokens.deleteMany({ user: userId });
  }
}
