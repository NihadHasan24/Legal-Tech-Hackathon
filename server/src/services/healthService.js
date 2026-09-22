import mongoose from 'mongoose'

export async function checkDatabase() {
  if (mongoose.connection.readyState !== 1) return false
  try {
    await mongoose.connection.db.admin().ping()
    return true
  } catch {
    return false
  }
}
