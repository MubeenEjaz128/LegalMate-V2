// CORS Configuration for Public Access
// Use this for port forwarding / public access

const allowedOrigins = [
  // Local development
  `https://localhost:${process.env.PORT || 5002}`,
  `http://localhost:${process.env.PORT || 5002}`,
  
  // Allow all origins if ALLOWED_ORIGINS=* in .env
  // This is useful for port forwarding / public access
  ...(process.env.ALLOWED_ORIGINS === '*' 
    ? [] 
    : (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
  ),
  
  // Always allow same-origin (no origin)
  undefined,
  'null'
];

module.exports = {
  origin: (origin, callback) => {
    // If ALLOWED_ORIGINS is set to *, allow all origins (for public access)
    if (process.env.ALLOWED_ORIGINS === '*') {
      return callback(null, true);
    }
    
    // Allow requests with no origin (same-origin, mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For port forwarding, you might want to allow all
    // Uncomment the line below if you want to allow all origins
    // callback(null, true);
    
    // Or log and allow (for development/testing)
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️  CORS: Allowing origin ${origin} (development mode)`);
      return callback(null, true);
    }
    
    // Otherwise block
    console.error(`❌ CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

