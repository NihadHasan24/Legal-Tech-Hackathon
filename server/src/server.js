import mongoose from 'mongoose'
import app from './app.js'

const port = Number(process.env.PORT || 5000)
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dlas'

try {
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'dlas', serverSelectionTimeoutMS: 5000 })
  app.listen(port, '127.0.0.1', () => console.log(`DLAS API listening on http://127.0.0.1:${port}`))
} catch (error) {
  console.error('MongoDB connection failed:', error.message)
  process.exitCode = 1
}
