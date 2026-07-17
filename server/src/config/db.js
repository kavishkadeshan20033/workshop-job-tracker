const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const logger = require('../middleware/logger');

const DB_PATH = path.resolve(__dirname, '../../', process.env.DB_PATH || './database/workshop.db');
const SCHEMA_PATH = path.resolve(__dirname, '../../database/schema.sql');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;

/**
 * Save database to disk
 */
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// Auto-save periodically (every 5 seconds)
setInterval(saveDatabase, 5000);

/**
 * Initialize database - must be called before using db
 */
async function initializeDatabase() {
    try {
        const SQL = await initSqlJs();

        // Load existing database or create new one
        if (fs.existsSync(DB_PATH)) {
            const fileBuffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(fileBuffer);
            logger.info('Database loaded from disk.');
        } else {
            db = new SQL.Database();
            logger.info('Created new database.');
        }

        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');

        // Check if tables exist
        const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");

        if (result.length === 0) {
            logger.info('Initializing database schema...');
            const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
            db.run(schema);

            // Seed default admin user
            const adminHash = bcrypt.hashSync('admin123', 10);
            db.run(
                'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
                ['admin', 'admin@workshop.com', adminHash, 'System Admin', 'admin']
            );

            // Seed default employee user
            const techHash = bcrypt.hashSync('tech123', 10);
            db.run(
                'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
                ['tech1', 'tech1@workshop.com', techHash, 'John Technician', 'employee']
            );

            // Seed a technician record for the employee (tech1 is id=2)
            db.run(
                'INSERT INTO technicians (user_id, name, specialization, phone) VALUES (?, ?, ?, ?)',
                [2, 'John Technician', 'Hardware Diagnostics', '555-0101']
            );

            // Seed sample parts
            const parts = [
                ['Generic SSD 500GB', 'SSD-500', 50, 45.99, 10, 'TechSupplies Inc', 'Storage'],
                ['DDR4 16GB RAM', 'RAM-16G-D4', 30, 39.49, 5, 'TechSupplies Inc', 'Memory'],
                ['Thermal Paste Tube', 'THRM-001', 25, 8.99, 5, 'CoolingCo', 'Accessories'],
                ['Screen Replacement 15"', 'SCR-15-01', 10, 85.00, 4, 'DisplayMasters', 'Screens'],
                ['Motherboard ATX', 'MB-ATX-01', 15, 120.99, 4, 'BoardMakers', 'Motherboards'],
                ['Power Supply 650W', 'PSU-650', 20, 55.99, 8, 'PowerUp', 'Power'],
                ['CPU Fan', 'FAN-CPU-01', 35, 15.99, 10, 'CoolingCo', 'Cooling'],
                ['SATA Cable', 'CBL-SATA-01', 100, 2.50, 20, 'CablesRUs', 'Cables'],
                ['USB-C Hub', 'HUB-USBC-01', 25, 22.99, 5, 'PeripheralsPro', 'Accessories'],
                ['Laptop Battery 4-cell', 'BAT-LPT-04', 12, 45.00, 5, 'PowerUp', 'Batteries'],
            ];

            for (const p of parts) {
                db.run(
                    'INSERT INTO parts (name, part_number, stock_qty, unit_price, reorder_level, supplier, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    p
                );
            }

            saveDatabase();
            logger.info('Database initialized with schema and seed data.');
            logger.info('Default admin: username=admin, password=admin123');
        } else {
            logger.info('Database already initialized.');
        }

        return db;
    } catch (error) {
        logger.error('Failed to initialize database:', error);
        throw error;
    }
}

/**
 * Helper: Execute a query and return all results as array of objects
 */
function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

/**
 * Helper: Execute a query and return first result as object
 */
function queryOne(sql, params = []) {
    const results = queryAll(sql, params);
    return results.length > 0 ? results[0] : null;
}

/**
 * Helper: Execute a write query (INSERT, UPDATE, DELETE) and return info
 */
function runQuery(sql, params = []) {
    db.run(sql, params);
    const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
    const changes = db.getRowsModified();
    saveDatabase();
    return { lastInsertRowid: lastId, changes };
}

/**
 * Get the database instance
 */
function getDb() {
    if (!db) throw new Error('Database not initialized. Call initializeDatabase() first.');
    return db;
}

module.exports = { initializeDatabase, getDb, queryAll, queryOne, runQuery, saveDatabase };
