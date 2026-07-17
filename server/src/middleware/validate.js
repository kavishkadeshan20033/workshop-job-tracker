const { validationResult } = require('express-validator');

/**
 * Middleware: Check express-validator results and return 400 if invalid
 */
function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
            })),
        });
    }
    next();
}

module.exports = { validate };
