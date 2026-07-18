const { queryAll, queryOne, runQuery } = require('../config/db');

const VehicleModel = {
    async findAll() {
        return queryAll(`
            SELECT v.*, CONCAT(c.first_name, ' ', c.last_name) as customer_name 
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            ORDER BY v.created_at DESC
        `);
    },

    async findById(id) {
        return queryOne(`
            SELECT v.*, CONCAT(c.first_name, ' ', c.last_name) as customer_name 
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            WHERE v.id = ?
        `, [id]);
    },

    async findByCustomerId(customerId) {
        return queryAll('SELECT * FROM vehicles WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
    },

    async create({ customer_id, make, model, year, vin, license_plate }) {
        const result = await runQuery(
            'INSERT INTO vehicles (customer_id, make, model, year, vin, license_plate) VALUES (?, ?, ?, ?, ?, ?)',
            [customer_id, make, model, year || null, vin || null, license_plate || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    async update(id, { customer_id, make, model, year, vin, license_plate }) {
        await runQuery(
            `UPDATE vehicles SET 
             customer_id = COALESCE(?, customer_id),
             make = COALESCE(?, make),
             model = COALESCE(?, model),
             year = COALESCE(?, year),
             vin = COALESCE(?, vin),
             license_plate = COALESCE(?, license_plate)
             WHERE id = ?`,
            [customer_id, make, model, year, vin, license_plate, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        return runQuery('DELETE FROM vehicles WHERE id = ?', [id]);
    },
};

module.exports = VehicleModel;
