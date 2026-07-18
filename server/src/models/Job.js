const { queryAll, queryOne, runQuery } = require('../config/db');

const JobModel = {
    async findAll(search = '', status = '') {
        let sql = `
            SELECT j.*, 
                   CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                   c.phone as customer_phone,
                   t.name as technician_name,
                   u.full_name as creator_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN technicians t ON j.technician_id = t.id
            LEFT JOIN users u ON j.created_by = u.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            sql += ` AND j.status = ?`;
            params.push(status);
        }

        if (search) {
            sql += ` AND (c.first_name LIKE ? OR c.last_name LIKE ? OR j.device_name LIKE ? OR j.problem_description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        sql += ` ORDER BY j.created_at DESC`;
        return queryAll(sql, params);
    },

    async findById(id) {
        return queryOne(`
            SELECT j.*, 
                   CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                   c.phone as customer_phone,
                   c.email as customer_email,
                   t.name as technician_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN technicians t ON j.technician_id = t.id
            WHERE j.id = ?
        `, [id]);
    },

    async create({ customer_id, technician_id, created_by, device_name, problem_description, priority, estimated_cost }) {
        const result = await runQuery(
            `INSERT INTO jobs (customer_id, technician_id, created_by, device_name, problem_description, priority, estimated_cost) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [customer_id, technician_id || null, created_by, device_name, problem_description, priority || 'medium', estimated_cost || 0]
        );
        return this.findById(result.lastInsertRowid);
    },

    async update(id, { technician_id, status, priority, date_out, estimated_cost, final_cost, device_name, problem_description }) {
        await runQuery(
            `UPDATE jobs SET 
                technician_id = COALESCE(?, technician_id),
                status = COALESCE(?, status),
                priority = COALESCE(?, priority),
                date_out = COALESCE(?, date_out),
                estimated_cost = COALESCE(?, estimated_cost),
                final_cost = COALESCE(?, final_cost),
                device_name = COALESCE(?, device_name),
                problem_description = COALESCE(?, problem_description),
                updated_at = NOW()
            WHERE id = ?`,
            [technician_id || null, status || null, priority || null, date_out || null, estimated_cost !== undefined ? estimated_cost : null, final_cost !== undefined ? final_cost : null, device_name || null, problem_description || null, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        return runQuery('DELETE FROM jobs WHERE id = ?', [id]);
    },

    async getParts(jobId) {
        return queryAll(`
            SELECT jp.*, p.name, p.part_number 
            FROM job_parts jp
            JOIN parts p ON jp.part_id = p.id
            WHERE jp.job_id = ?
        `, [jobId]);
    },
    
    async addPart(jobId, partId, quantity, unitPrice) {
        return runQuery(
            'INSERT INTO job_parts (job_id, part_id, quantity_used, unit_price_at_time) VALUES (?, ?, ?, ?)',
            [jobId, partId, quantity, unitPrice]
        );
    },

    async removePart(jobPartId) {
        return runQuery('DELETE FROM job_parts WHERE id = ?', [jobPartId]);
    },

    async getStats() {
        return queryOne(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'waiting_parts' THEN 1 ELSE 0 END) as waiting_parts
            FROM jobs
        `);
    },

    async getDailyReport(date) {
        return queryAll(`
            SELECT j.*, 
                   CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                   t.name as technician_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN technicians t ON j.technician_id = t.id
            WHERE DATE(j.date_in) = ?
            ORDER BY j.created_at DESC
        `, [date]);
    },

    async getMonthlyReport(year, month) {
        return queryAll(`
            SELECT j.*, 
                   CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                   t.name as technician_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN technicians t ON j.technician_id = t.id
            WHERE DATE_FORMAT(j.date_in, '%Y-%m') = ?
            ORDER BY j.created_at DESC
        `, [`${year}-${month.toString().padStart(2, '0')}`]);
    }
};

module.exports = JobModel;
