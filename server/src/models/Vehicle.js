const { queryAll, queryOne, runQuery } = require('../config/db');

const VehicleModel = {
    findAll() {
        return queryAll(`
            SELECT v.*, c.first_name || ' ' || c.last_name as customer_name 
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            ORDER BY v.created_at DESC
        `);
    },

    findById(id) {
        return queryOne(`
            SELECT v.*, c.first_name || ' ' || c.last_name as customer_name 
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            WHERE v.id = ?
        `, [id]);
    },

    findByCustomerId(customerId) {
        return queryAll('SELECT * FROM vehicles WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
    },

    create({ customer_id, make, model, year, vin, license_plate }) {
        const result = runQuery(
            'INSERT INTO vehicles (customer_id, make, model, year, vin, license_plate) VALUES (?, ?, ?, ?, ?, ?)',
            [customer_id, make, model, year || null, vin || null, license_plate || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    update(id, { customer_id, make, model, year, vin, license_plate }) {
        runQuery(
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

    delete(id) {
        return runQuery('DELETE FROM vehicles WHERE id = ?', [id]);
    },
};

module.exports = VehicleModel;
