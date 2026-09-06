const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'legalmate-super-secret-jwt-key-2024'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    throw new Error('Invalid token')
  }
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  generateToken,
  verifyToken
} 