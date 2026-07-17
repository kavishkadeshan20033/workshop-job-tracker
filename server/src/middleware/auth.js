const { verifyToken } = require('../utils/jwt');
const logger = require('./logger');

/**
 * Middleware: Verify JWT token from Authorization header
 */
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        logger.warn(`Invalid token attempt from IP: ${req.ip}`);
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

/**
 * Middleware: Restrict access to specific roles
 */
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        if (!roles.includes(req.user.role)) {
            logger.warn(`Unauthorized access attempt by user ${req.user.username} (role: ${req.user.role}) to ${req.method} ${req.path}`);
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }

        next();
    };
}

module.exports = { authenticate, authorize };
