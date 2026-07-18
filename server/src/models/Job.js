const { queryAll, queryOne, runQuery } = require('../config/db');

const JobModel = {
    async findAll(search = '', status = '') {
        let sql = `
            SELECT j.*,
                   c.first_name || ' ' || c.last_name AS customer_name,
                   c.phone AS customer_phone,
                   t.name AS technician_name,
                   u.full_name AS creator_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN technicians t ON j.technician_id = t.id
            LEFT JOIN users u ON j.created_by = u.id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (status) {
            sql += ` AND j.status = $${idx++}`;
            params.push(status);
        }

        if (search) {
            sql += ` AND (c.first_name ILIKE $${idx} OR c.last_name ILIKE $${idx} OR j.device_name ILIKE $${idx} OR j.problem_description ILIKE $${idx})`;
            params.push(`%${search}%`);
        }

        sql += ` ORDER BY j.created_at DESC`;
        return queryAll(sql, params);
    },

    async findById(id) {
        return queryOne(`
            SELECT j.*,
                   c.first_name || ' ' || c.last_name AS customer_name,
                   c.phone AS customer_phone,
                   c.email AS customer_email,
                   t.name AS technician_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN technicians t ON j.technician_id = t.id
            WHERE j.id = $1
        `, [id]);
    },

    async create({ customer_id, technician_id, created_by, device_name, problem_description, priority, estimated_cost }) {
        const result = await runQuery(
            `INSERT INTO jobs (customer_id, technician_id, created_by, device_name, problem_description, priority, estimated_cost)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [customer_id, technician_id || null, created_by, device_name, problem_description, priority || 'medium', estimated_cost || 0]
        );
        return this.findById(result.lastInsertRowid);
    },

    async update(id, { technician_id, status, priority, date_out, estimated_cost, final_cost, device_name, problem_description }) {
        await runQuery(
            `UPDATE jobs SET
                technician_id = COALESCE($1, technician_id),
                status = COALESCE($2, status),
                priority = COALESCE($3, priority),
                date_out = COALESCE($4, date_out),
                estimated_cost = COALESCE($5, estimated_cost),
                final_cost = COALESCE($6, final_cost),
                device_name = COALESCE($7, device_name),
                problem_description = COALESCE($8, problem_description),
                updated_at = NOW()
            WHERE id = $9`,
            [
                technician_id || null,
                status || null,
                priority || null,
                date_out || null,
                estimated_cost !== undefined ? estimated_cost : null,
                final_cost !== undefined ? final_cost : null,
                device_name || null,
                problem_description || null,
                id
            ]
        );
        return this.findById(id);
    },

    async delete(id) {
        return runQuery('DELETE FROM jobs WHERE id = $1', [id]);
    },

    async getParts(jobId) {
        return queryAll(`
            SELECT jp.*, p.name, p.part_number
            FROM job_parts jp
            JOIN parts p ON jp.part_id = p.id
            WHERE jp.job_id = $1
        `, [jobId]);
    },

    async addPart(jobId, partId, quantity, unitPrice) {
        return runQuery(
            'INSERT INTO job_parts (job_id, part_id, quantity_used, unit_price_at_time) VALUES ($1, $2, $3, $4)',
            [jobId, partId, quantity, unitPrice]
        );
    },

    async removePart(jobPartId) {
        return runQuery('DELETE FROM job_parts WHERE id = $1', [jobPartId]);
    },

    async getStats() {
        return queryOne(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'waiting_parts' THEN 1 ELSE 0 END) AS waiting_parts
            FROM jobs
        `);
    },

    async getDailyReport(date) {
        return queryAll(`
            SELECT j.*,
                   c.first_name || ' ' || c.last_name AS customer_name,
                   t.name AS technician_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN technicians t ON j.technician_id = t.id
            WHERE j.date_in::date = $1::date
            ORDER BY j.created_at DESC
        `, [date]);
    },

    async getMonthlyReport(year, month) {
        return queryAll(`
            SELECT j.*,
                   c.first_name || ' ' || c.last_name AS customer_name,
                   t.name AS technician_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN technicians t ON j.technician_id = t.id
            WHERE EXTRACT(YEAR FROM j.date_in) = $1
              AND EXTRACT(MONTH FROM j.date_in) = $2
            ORDER BY j.created_at DESC
        `, [year, month]);
    },
};

module.exports = JobModel;
