
const winston = require('winston');
const path = require('path');
const fs = require('fs');

const isVercel = process.env.VERCEL;

const logsDir = path.resolve(__dirname, '../../logs');
if (!isVercel && !fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const transports = [];

if (!isVercel) {
    transports.push(
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5,
        })
    );
}

if (isVercel || process.env.NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaStr = Object.keys(meta).length > 1
                        ? JSON.stringify(meta, null, 2)
                        : '';
                    return `${timestamp} [${level}]: ${message} ${metaStr}`;
                })
            ),
        })
    );
}

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'workshop-job-tracker' },
    transports: transports,
});

module.exports = logger;
