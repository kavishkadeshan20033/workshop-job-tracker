const { queryAll, queryOne, runQuery } = require('../config/db');

const DeviceModel = {
    async findAll() {
        return queryAll(`
            SELECT d.*, CONCAT(c.first_name, ' ', c.last_name) as customer_name 
            FROM devices d
            LEFT JOIN customers c ON d.customer_id = c.id
            ORDER BY d.created_at DESC
        `);
    },

    async findById(id) {
        return queryOne(`
            SELECT d.*, CONCAT(c.first_name, ' ', c.last_name) as customer_name 
            FROM devices d
            LEFT JOIN customers c ON d.customer_id = c.id
            WHERE d.id = ?
        `, [id]);
    },

    async findByCustomerId(customerId) {
        return queryAll('SELECT * FROM devices WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
    },

    async create({ customer_id, brand, model, year, serial_number, device_type }) {
        const result = await runQuery(
            'INSERT INTO devices (customer_id, brand, model, year, serial_number, device_type) VALUES (?, ?, ?, ?, ?, ?)',
            [customer_id, brand, model, year || null, serial_number || null, device_type || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    async update(id, { customer_id, brand, model, year, serial_number, device_type }) {
        await runQuery(
            `UPDATE devices SET 
             customer_id = COALESCE(?, customer_id),
             brand = COALESCE(?, brand),
             model = COALESCE(?, model),
             year = COALESCE(?, year),
             serial_number = COALESCE(?, serial_number),
             device_type = COALESCE(?, device_type)
             WHERE id = ?`,
            [customer_id || null, brand || null, model || null, year || null, serial_number || null, device_type || null, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        return runQuery('DELETE FROM devices WHERE id = ?', [id]);
    },
};

module.exports = DeviceModel;
