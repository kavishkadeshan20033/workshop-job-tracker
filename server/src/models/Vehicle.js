const { queryAll, queryOne, runQuery } = require('../config/db');

const VehicleModel = {
    async findAll() {
        return queryAll(`
            SELECT v.*, c.first_name || ' ' || c.last_name AS customer_name
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            ORDER BY v.created_at DESC
        `);
    },

    async findById(id) {
        return queryOne(`
            SELECT v.*, c.first_name || ' ' || c.last_name AS customer_name
            FROM vehicles v
            LEFT JOIN customers c ON v.customer_id = c.id
            WHERE v.id = $1
        `, [id]);
    },

    async findByCustomerId(customerId) {
        return queryAll('SELECT * FROM vehicles WHERE customer_id = $1 ORDER BY created_at DESC', [customerId]);
    },

    async create({ customer_id, make, model, year, vin, license_plate }) {
        const result = await runQuery(
            'INSERT INTO vehicles (customer_id, make, model, year, vin, license_plate) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [customer_id, make, model, year || null, vin || null, license_plate || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    async update(id, { customer_id, make, model, year, vin, license_plate }) {
        await runQuery(
            `UPDATE vehicles SET
                customer_id = COALESCE($1, customer_id),
                make = COALESCE($2, make),
                model = COALESCE($3, model),
                year = COALESCE($4, year),
                vin = COALESCE($5, vin),
                license_plate = COALESCE($6, license_plate)
            WHERE id = $7`,
            [customer_id || null, make || null, model || null, year || null, vin || null, license_plate || null, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        return runQuery('DELETE FROM vehicles WHERE id = $1', [id]);
    },
};

module.exports = VehicleModel;
