const COLLECTION = 'users'

export function createUserDb(db) {
  return {
    findByEmail: (email) =>
      db.findOne(COLLECTION, { email: email.toLowerCase().trim() }),

    findById: (id) =>
      db.findOne(COLLECTION, { _id: id }),

    findByRefreshToken: (hash) =>
      db.findOne(COLLECTION, { refreshTokenHash: hash }),

    findByEmailVerificationToken: (token) =>
      db.findOne(COLLECTION, { emailVerificationToken: token }),

    findByEmailAndVerificationToken: (email, token) =>
      db.findOne(COLLECTION, { email: email.toLowerCase().trim(), emailVerificationToken: token }),

    findByEmailAndOtp: (email, otp) =>
      db.findOne(COLLECTION, {
        email: email.toLowerCase().trim(),
        passwordResetToken: otp,
        passwordResetExpires: { $gt: new Date() },
      }),

    findByUsernameExcludingId: (username, excludeId) =>
      db.findOne(COLLECTION, { 'profile.username': username, _id: { $ne: excludeId } }),

    create: (data) =>
      db.insertOne(COLLECTION, data),

    update: (id, data) =>
      db.updateOne(COLLECTION, { _id: id }, { $set: data }),

    setField: (id, field, value) =>
      db.updateOne(COLLECTION, { _id: id }, { $set: { [field]: value } }),

    deleteById: (id) =>
      db.deleteOne(COLLECTION, { _id: id }),
  }
}
