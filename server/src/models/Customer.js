const { queryAll, queryOne, runQuery } = require('../config/db');

const CustomerModel = {
    async findAll(search = '') {
        if (search) {
            return queryAll(
                `SELECT * FROM customers WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 ORDER BY created_at DESC`,
                [`%${search}%`]
            );
        }
        return queryAll('SELECT * FROM customers ORDER BY created_at DESC');
    },

    async findById(id) {
        return queryOne('SELECT * FROM customers WHERE id = $1', [id]);
    },

    async create({ first_name, last_name, phone, email, address }) {
        const result = await runQuery(
            'INSERT INTO customers (first_name, last_name, phone, email, address) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [first_name, last_name, phone || null, email || null, address || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    async update(id, { first_name, last_name, phone, email, address }) {
        await runQuery(
            `UPDATE customers SET
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                phone = COALESCE($3, phone),
                email = COALESCE($4, email),
                address = COALESCE($5, address),
                updated_at = NOW()
            WHERE id = $6`,
            [first_name || null, last_name || null, phone || null, email || null, address || null, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        return runQuery('DELETE FROM customers WHERE id = $1', [id]);
    },

    async getJobs(customerId) {
        return queryAll('SELECT * FROM jobs WHERE customer_id = $1 ORDER BY created_at DESC', [customerId]);
    },
};

module.exports = CustomerModel;
