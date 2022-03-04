import { ObjectId } from 'mongodb';

export function hexOrObjectId(hexOrId) {
  if (hexOrId instanceof ObjectId) {
    return hexOrId;
  }
  if (!hexOrId || hexOrId.length !== 24) {
    return hexOrId;
  }
  return ObjectId.createFromHexString(hexOrId);
}
