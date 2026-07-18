const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const logger = require('../middleware/logger');

// Create connection pool using DATABASE_URL (Render provides this automatically)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Initialize database — run schema and seed if tables don't exist
 */
async function initializeDatabase() {
    try {
        const client = await pool.connect();
        logger.info('PostgreSQL connected successfully.');

        // Check if users table exists
        const result = await client.query(
            `SELECT to_regclass('public.users') AS table_name`
        );

        if (!result.rows[0].table_name) {
            logger.info('Initializing database schema...');
            const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await client.query(schema);

            // Seed default admin user
            const adminHash = bcrypt.hashSync('admin123', 10);
            await client.query(
                'INSERT INTO users (username, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)',
                ['admin', 'admin@workshop.com', adminHash, 'System Admin', 'admin']
            );

            // Seed default employee user
            const techHash = bcrypt.hashSync('tech123', 10);
            await client.query(
                'INSERT INTO users (username, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)',
                ['tech1', 'tech1@workshop.com', techHash, 'John Technician', 'employee']
            );

            // Get tech1's id
            const techUser = await client.query('SELECT id FROM users WHERE username = $1', ['tech1']);
            const techUserId = techUser.rows[0].id;

            // Seed a technician record for the employee
            await client.query(
                'INSERT INTO technicians (user_id, name, specialization, phone) VALUES ($1, $2, $3, $4)',
                [techUserId, 'John Technician', 'Hardware Diagnostics', '555-0101']
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
                await client.query(
                    'INSERT INTO parts (name, part_number, stock_qty, unit_price, reorder_level, supplier, category) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    p
                );
            }

            logger.info('Database initialized with schema and seed data.');
            logger.info('Default admin: username=admin, password=admin123');
        } else {
            logger.info('Database already initialized.');
        }

        client.release();
        return pool;
    } catch (error) {
        logger.error('Failed to initialize database:', error);
        throw error;
    }
}

/**
 * Helper: Execute a query and return all results as array of objects
 */
async function queryAll(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows;
}

/**
 * Helper: Execute a query and return first result as object
 */
async function queryOne(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
}

/**
 * Helper: Execute a write query (INSERT, UPDATE, DELETE)
 * Returns { lastInsertRowid, changes } for compatibility
 */
async function runQuery(sql, params = []) {
    const result = await pool.query(sql, params);
    return {
        lastInsertRowid: result.rows[0]?.id || null,
        changes: result.rowCount,
        row: result.rows[0] || null,
    };
}

/**
 * Get the pool instance
 */
function getDb() {
    return pool;
}

module.exports = { initializeDatabase, getDb, queryAll, queryOne, runQuery };
