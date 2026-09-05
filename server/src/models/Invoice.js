const { queryAll, queryOne, runQuery } = require('../config/db');

const InvoiceModel = {
    async findAll() {
        return queryAll(`
            SELECT i.*, j.problem_description AS job_description, j.device_name,
            CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
            c.phone AS customer_phone, c.email AS customer_email
            FROM invoices i
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN customers c ON j.customer_id = c.id
            ORDER BY i.issued_at DESC
        `);
    },

    async findById(id) {
        return queryOne(`
            SELECT i.*, j.problem_description AS job_description, j.date_in, j.date_out, j.device_name,
            CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
            c.phone AS customer_phone, c.email AS customer_email, c.address AS customer_address
            FROM invoices i
            LEFT JOIN jobs j ON i.job_id = j.id
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE i.id = ?
        `, [id]);
    },

    async findByJobId(jobId) {
        return queryOne('SELECT * FROM invoices WHERE job_id = ?', [jobId]);
    },

    async create({ job_id, labor_total = 0, parts_total, tax_rate = 0.10, notes }) {
        const existing = await this.findByJobId(job_id);
        if (existing) {
            return this.update(existing.id, { labor_total, parts_total, tax_rate, notes });
        }

        let finalParts = parts_total !== undefined && parts_total !== null ? parseFloat(parts_total) : null;
        if (finalParts === null) {
            const partsRow = await queryOne('SELECT COALESCE(SUM(quantity_used * unit_price_at_time), 0) as total FROM job_parts WHERE job_id = ?', [job_id]);
            finalParts = parseFloat(partsRow?.total || 0);
        }

        const finalLabor = parseFloat(labor_total || 0);
        const finalTaxRate = parseFloat(tax_rate !== undefined && tax_rate !== null ? tax_rate : 0.10);
        const subtotal = finalLabor + finalParts;
        const taxAmount = subtotal * finalTaxRate;
        const totalAmount = subtotal + taxAmount;

        const result = await runQuery(
            'INSERT INTO invoices (job_id, labor_total, parts_total, tax_rate, tax_amount, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [job_id, finalLabor, finalParts, finalTaxRate, taxAmount, totalAmount, notes || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    async update(id, data = {}) {
        const existing = await this.findById(id);
        if (!existing) return null;

        const newLabor = data.labor_total !== undefined ? parseFloat(data.labor_total) : parseFloat(existing.labor_total || 0);
        const newTaxRate = data.tax_rate !== undefined ? parseFloat(data.tax_rate) : parseFloat(existing.tax_rate || 0.10);
        
        let newParts = data.parts_total !== undefined ? parseFloat(data.parts_total) : parseFloat(existing.parts_total || 0);
        if (data.parts_total === undefined && existing.job_id) {
            const partsRow = await queryOne('SELECT COALESCE(SUM(quantity_used * unit_price_at_time), 0) as total FROM job_parts WHERE job_id = ?', [existing.job_id]);
            if (partsRow) newParts = parseFloat(partsRow.total || 0);
        }

        const subtotal = newLabor + newParts;
        const taxAmount = subtotal * newTaxRate;
        const totalAmount = subtotal + taxAmount;

        const paymentStatus = data.payment_status !== undefined ? data.payment_status : existing.payment_status;
        const paidAt = paymentStatus === 'paid' ? (existing.paid_at || new Date().toISOString().slice(0, 19).replace('T', ' ')) : null;
        const notes = data.notes !== undefined ? data.notes : existing.notes;

        await runQuery(
            `UPDATE invoices SET 
             labor_total = ?, 
             parts_total = ?, 
             tax_rate = ?, 
             tax_amount = ?, 
             total_amount = ?, 
             payment_status = ?, 
             paid_at = ?, 
             notes = ?
             WHERE id = ?`,
            [newLabor, newParts, newTaxRate, taxAmount, totalAmount, paymentStatus, paidAt, notes || null, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        return runQuery('DELETE FROM invoices WHERE id = ?', [id]);
    },
};

module.exports = InvoiceModel;
