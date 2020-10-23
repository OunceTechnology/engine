import { db } from './db.mjs';

export const databaseTeams = {
  async createTeam({ _id, ...team }) {
    const { insertedId } = await db.teams.insertOne(team);

    return insertedId.toString();
  },

  async deleteTeam(teamId) {
    const {
      lastErrorObject: { n },
    } = await db.teams.findOneAndDelete(
      { _id: db.toObjectId(teamId) },
      { projection: { _id: 1 } },
    );

    if (n !== 1) {
      throw new Error('Team not deleted');
    }
  },

  async getTeams({ nameOnly = false } = {}) {
    const projection = nameOnly ? { name: 1 } : {};
    return db.teams.find({}, { projection }).toArray();
  },

  async getTeamsById(ids) {
    return db.teams
      .find({ _id: { $in: ids.map(id => db.toObjectId(id)) } })
      .toArray();
  },

  async getTeamByName(name) {
    return await db.teams.findOne({ name });
  },

  async getTeamById(teamId) {
    return await db.teams.findOne({ _id: db.toObjectId(teamId) });
  },

  async updateTeam({ _id: id, ...team }) {
    const _id = db.toObjectId(id);

    const {
      lastErrorObject: { n },
    } = await db.teams.findOneAndUpdate(
      { _id },
      { $set: team },
      { projection: { _id: 1 } },
    );

    if (n !== 1) {
      throw new Error('Failed updating team');
    }
  },
};
