const { queryAll, queryOne, runQuery } = require('../config/db');

const CustomerModel = {
    findAll(search = '') {
        if (search) {
            return queryAll(
                `SELECT * FROM customers WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY created_at DESC`,
                [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
            );
        }
        return queryAll('SELECT * FROM customers ORDER BY created_at DESC');
    },

    findById(id) {
        return queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    },

    create({ first_name, last_name, phone, email, address }) {
        const result = runQuery(
            'INSERT INTO customers (first_name, last_name, phone, email, address) VALUES (?, ?, ?, ?, ?)',
            [first_name, last_name, phone || null, email || null, address || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    update(id, { first_name, last_name, phone, email, address }) {
        runQuery(
            `UPDATE customers SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name),
            phone = COALESCE(?, phone), email = COALESCE(?, email), address = COALESCE(?, address),
            updated_at = datetime('now') WHERE id = ?`,
            [first_name || null, last_name || null, phone || null, email || null, address || null, id]
        );
        return this.findById(id);
    },

    delete(id) {
        return runQuery('DELETE FROM customers WHERE id = ?', [id]);
    },

    getJobs(customerId) {
        return queryAll('SELECT * FROM jobs WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
    },
};

module.exports = CustomerModel;
