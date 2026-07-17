const { queryAll, queryOne, runQuery } = require('../config/db');

const InvoiceModel = {
    findAll() {
        return queryAll(`
            SELECT i.*, j.problem_description AS job_description, j.device_name,
            c.first_name || ' ' || c.last_name AS customer_name
            FROM invoices i
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN customers c ON j.customer_id = c.id
            ORDER BY i.issued_at DESC
        `);
    },

    findById(id) {
        return queryOne(`
            SELECT i.*, j.problem_description AS job_description, j.date_in, j.date_out, j.device_name,
            c.first_name || ' ' || c.last_name AS customer_name,
            c.phone AS customer_phone, c.email AS customer_email, c.address AS customer_address
            FROM invoices i
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE i.id = ?
        `, [id]);
    },

    findByJobId(jobId) {
        return queryOne('SELECT * FROM invoices WHERE job_id = ?', [jobId]);
    },

    create({ job_id, labor_total = 0, tax_rate = 0.10, notes }) {
        const partsTotal = queryOne('SELECT COALESCE(SUM(quantity_used * unit_price_at_time), 0) as total FROM job_parts WHERE job_id = ?', [job_id])?.total || 0;
        const subtotal = parseFloat(labor_total) + partsTotal;
        const taxAmount = subtotal * parseFloat(tax_rate);
        const totalAmount = subtotal + taxAmount;

        const result = runQuery(
            'INSERT INTO invoices (job_id, labor_total, parts_total, tax_rate, tax_amount, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [job_id, labor_total, partsTotal, tax_rate, taxAmount, totalAmount, notes || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    update(id, { payment_status, notes }) {
        const paidAt = payment_status === 'paid' ? new Date().toISOString() : null;
        runQuery(
            'UPDATE invoices SET payment_status = COALESCE(?, payment_status), paid_at = COALESCE(?, paid_at), notes = COALESCE(?, notes) WHERE id = ?',
            [payment_status || null, paidAt, notes || null, id]
        );
        return this.findById(id);
    },

    delete(id) {
        return runQuery('DELETE FROM invoices WHERE id = ?', [id]);
    },
};

module.exports = InvoiceModel;
