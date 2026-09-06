// backend/middleware/errorHandler.js
module.exports = (err, req, res, next) => {
    console.error(err); // or use a logger
    const status = err.statusCode || 500;
    res.status(status).json({
      error: {
        message: err.message || 'Internal Server Error',
        // you can add `stack: err.stack` in dev only
      }
    });
  };
  