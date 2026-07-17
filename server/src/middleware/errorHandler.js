const logger = require('./logger');

/**
 * Centralized error handling middleware
 */
function errorHandler(err, req, res, next) {
    // Log the error
    logger.error(`${err.message}`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userId: req.user?.id || 'anonymous',
        stack: err.stack,
    });

    // Determine status code
    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 ? 'Internal server error' : err.message;

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

/**
 * 404 handler for unmatched routes
 */
function notFoundHandler(req, res) {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
}

module.exports = { errorHandler, notFoundHandler };
