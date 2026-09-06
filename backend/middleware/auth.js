// const User = require('../models/User')
// const { verifyToken } = require('../config/jwt')

// const auth = async (req, res, next) => {
//   try {
//     // Get token from header
//     const authHeader = req.header('Authorization')
    
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       console.log('No valid authorization header:', authHeader)
//       return res.status(401).json({ message: 'No token, authorization denied' })
//     }

//     // Extract token
//     const token = authHeader.substring(7) // Remove 'Bearer ' prefix
//     console.log('Extracted token:', token.substring(0, 20) + '...')

//     // Verify token
//     const decoded = verifyToken(token)
//     console.log('Token decoded successfully:', { userId: decoded.userId, role: decoded.role })
    
//     // Check if user exists
//     const user = await User.findById(decoded.userId)
//     if (!user) {
//       console.log('User not found for token:', decoded.userId)
//       return res.status(401).json({ message: 'Token is not valid' })
//     }

//     // Check if user is active
//     if (!user.isActive) {
//       console.log('User account is deactivated:', user.email)
//       return res.status(401).json({ message: 'Account is deactivated' })
//     }

//     // Add user info to request
//     req.user = {
//       _id: user._id,
//       userId: decoded.userId,
//       role: decoded.role,
//       name: user.name,
//       email: user.email
//     }

//     console.log('Auth middleware success for user:', user.email)
//     next()
//   } catch (error) {
//     console.error('Auth middleware error:', error)
//     console.error('Error details:', error.message)
//     res.status(401).json({ message: 'Token is not valid' })
//   }
// }

// // Role-based authorization middleware
// const authorize = (...roles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({ message: 'Authentication required' })
//     }

//     if (!roles.includes(req.user.role)) {
//       return res.status(403).json({ message: 'Access denied. Insufficient permissions.' })
//     }

//     next()
//   }
// }

// // Specific role middleware functions
// const requireClient = authorize('client')
// const requireLawyer = authorize('lawyer')
// const requireAdmin = authorize('admin')
// const requireLawyerOrAdmin = authorize('lawyer', 'admin')

// module.exports = {
//   auth,
//   authorize,
//   requireClient,
//   requireLawyer,
//   requireAdmin,
//   requireLawyerOrAdmin
// } 

const crypto = require('crypto')
const User = require('../models/User')
const { verifyToken } = require('../config/jwt')

// Hash token for session comparison
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Extract JWT from either:
 *  - Authorization: Bearer <token>
 *  - Authorization: bearer <token>
 *  - Cookie: token=<jwt>  (requires cookie-parser)
 *  - Fallback: raw header value treated as token (rare, but safer)
 */
function extractToken(req) {
  const authHeader = req.get('authorization') || req.get('Authorization')
  let token = null

  if (authHeader) {
    // Trim and split by spaces; handle multiple spaces safely
    const parts = authHeader.trim().split(/\s+/)
    if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
      token = parts[1]
    } else if (parts.length === 1) {
      // Some clients might send just the token (not recommended)
      token = parts[0]
    }
  }

  // Cookie fallback (if using cookie-parser)
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token
  }

  return token
}

const auth = async (req, res, next) => {
  try {
    const token = extractToken(req)

    if (!token) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔒 No token found in Authorization header or cookies')
      }
      return res.status(401).json({ message: 'No token provided' })
    }

    let decoded
    try {
      decoded = verifyToken(token)
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔑 Token decoded successfully:', { userId: decoded.userId, role: decoded.role })
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ JWT verify error:', e.message)
      }
      const msg =
        e.name === 'TokenExpiredError'
          ? 'Token expired'
          : 'Token is not valid'
      return res.status(401).json({ message: msg })
    }

    // Minimal user fetch (include activeSessionToken for single-device check)
    const user = await User.findById(decoded.userId).select(
      '_id name email role isActive activeSessionToken'
    )

    if (!user) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('👤 User not found for token userId:', decoded.userId)
      }
      return res.status(401).json({ message: 'Token is not valid' })
    }

    if (!user.isActive) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🚫 User deactivated:', user.email)
      }
      return res.status(401).json({ message: 'Account is deactivated' })
    }

    // Single-device enforcement: check if this token is still the active session
    if (user.activeSessionToken && hashToken(token) !== user.activeSessionToken) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('📱 Session replaced — user logged in from another device:', user.email)
      }
      return res.status(401).json({
        message: 'Your account has been logged in from another device. You have been logged out.',
        code: 'SESSION_REPLACED'
      })
    }

    // Attach useful context to req
    req.user = {
      _id: user._id,
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    }
    req.isAdmin = user.role === 'admin'
    req.authToken = token
    
    // Debug logging for admin issues
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Auth middleware - User role:', user.role, 'User email:', user.email, 'Is admin:', req.isAdmin)
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Auth OK:', { email: user.email, role: user.role })
    }

    next()
  } catch (error) {
    console.error('Auth middleware unexpected error:', error)
    res.status(401).json({ message: 'Authentication failed' })
  }
}

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' })
    }
    if (!roles.includes(req.user.role)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔐 Forbidden:', {
          needOneOf: roles,
          has: req.user.role,
          user: req.user.email,
        })
      }
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' })
    }
    next()
  }
}

// Specific role middleware functions
const requireClient = authorize('client')
const requireLawyer = authorize('lawyer')
const requireAdmin = authorize('admin')
const requireLawyerOrAdmin = authorize('lawyer', 'admin')

module.exports = {
  auth,
  authorize,
  requireClient,
  requireLawyer,
  requireAdmin,
  requireLawyerOrAdmin,
}
