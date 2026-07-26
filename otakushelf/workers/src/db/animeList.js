const COLLECTION = 'animerists'

export function createAnimeListDb(db) {
  return {
    findByUserId: (userId) =>
      db.findOne(COLLECTION, { userId }),

    create: (data) =>
      db.insertOne(COLLECTION, data),

    updateOne: (filter, update) =>
      db.updateOne(COLLECTION, filter, update),
  }
}
