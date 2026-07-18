const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const logger = require('../middleware/logger');

// Create a connection pool — works great with Vercel serverless
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

/**
 * Initialize database — seeds default data if tables are empty
 */
async function initializeDatabase() {
    try {
        // Test connection
        const conn = await pool.getConnection();
        logger.info('✅ MySQL connected successfully.');

        // Check if users table has any rows (tables must already exist via mysql_schema.sql)
        const [rows] = await conn.execute("SELECT COUNT(*) as count FROM users");
        const count = rows[0].count;

        if (count === 0) {
            logger.info('Seeding default admin user...');

            const adminHash = bcrypt.hashSync('admin123', 10);
            await conn.execute(
                'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
                ['admin', 'admin@workshop.com', adminHash, 'System Admin', 'admin']
            );

            const techHash = bcrypt.hashSync('tech123', 10);
            await conn.execute(
                'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
                ['tech1', 'tech1@workshop.com', techHash, 'John Technician', 'employee']
            );

            // Get tech1's id
            const [techUser] = await conn.execute("SELECT id FROM users WHERE username = 'tech1'");
            const techUserId = techUser[0].id;

            await conn.execute(
                'INSERT INTO technicians (user_id, name, specialization, phone) VALUES (?, ?, ?, ?)',
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
                await conn.execute(
                    'INSERT INTO parts (name, part_number, stock_qty, unit_price, reorder_level, supplier, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    p
                );
            }

            logger.info('✅ Database seeded. Default admin: username=admin, password=admin123');
        } else {
            logger.info('Database already has data — skipping seed.');
        }

        conn.release();
        return pool;
    } catch (error) {
        logger.error('❌ Failed to initialize database:', error.message);
        throw error;
    }
}

/**
 * Execute a SELECT query — returns array of row objects
 */
async function queryAll(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

/**
 * Execute a SELECT query — returns first row or null
 */
async function queryOne(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute INSERT / UPDATE / DELETE — returns { lastInsertRowid, changes }
 */
async function runQuery(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return {
        lastInsertRowid: result.insertId,
        changes: result.affectedRows,
    };
}

module.exports = { initializeDatabase, queryAll, queryOne, runQuery, pool };
