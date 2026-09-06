const mongoose = require('mongoose')

/**
 * Connects to MongoDB using Mongoose.
 * Uses MONGODB_URI from environment or defaults to local instance.
 * Logs helpful errors if connection fails or if MONGODB_URI is missing.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/legalmate'
  if (!process.env.MONGODB_URI) {
    console.warn('[LegalMate] Warning: MONGODB_URI not set in environment. Using default: mongodb://localhost:27017/legalmate')
  }
  try {
    const conn = await mongoose.connect(uri)
    console.log(`MongoDB Connected: ${conn.connection.host}`)
    console.log(`Database URL: ${uri}`)
    return conn
  } catch (error) {
    console.error('MongoDB connection error:', error)
    if (error.message && error.message.includes('failed to connect')) {
      console.error('Check that your MongoDB server is running and that MONGODB_URI is correct.')
    }
    process.exit(1)
  }
}

module.exports = connectDB 
