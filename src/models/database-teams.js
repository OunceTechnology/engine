export class Teams {
  constructor(database, ObjectId) {
    this.db = database;
    this.ObjectId = ObjectId;
  }
  async createTeam(teamSpec) {
    const { _id, ...team } = teamSpec;
    const { insertedId } = await this.db.teams.insertOne(team);

    return insertedId.toString();
  }

  async deleteTeam(teamId) {
    const {
      lastErrorObject: { n },
    } = await this.db.teams.findOneAndDelete(
      { _id: new this.ObjectId(teamId) },
      { projection: { _id: 1 } },
    );

    if (n !== 1) {
      throw new Error('Team not deleted');
    }
  }

  async getTeams({ nameOnly = false } = {}) {
    const projection = nameOnly ? { name: 1 } : {};
    return this.db.teams.find({}, { projection }).toArray();
  }

  async getTeamsById(ids) {
    return this.db.teams
      .find({ _id: { $in: ids.map(id => new this.ObjectId(id)) } })
      .toArray();
  }

  async getTeamByName(name) {
    return await this.db.teams.findOne({ name });
  }

  async getTeamById(teamId) {
    return await this.db.teams.findOne({ _id: new this.ObjectId(teamId) });
  }

  async updateTeam(teamSpec) {
    const { _id: id, ...team } = teamSpec;
    const _id = new this.ObjectId(id);

    const {
      lastErrorObject: { n },
    } = await this.db.teams.findOneAndUpdate(
      { _id },
      { $set: team },
      { projection: { _id: 1 } },
    );

    if (n !== 1) {
      throw new Error('Failed updating team');
    }
  }
}
