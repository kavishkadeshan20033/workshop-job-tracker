const { queryAll, queryOne, runQuery } = require('../config/db');

const JobModel = {
    async findAll(search = '', status = '', user = null) {
        let sql = `
            SELECT j.*, 
                   CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                   c.phone as customer_phone,
                   t.name as technician_name,
                   u.full_name as creator_name,
                   v.make as vehicle_make,
                   v.model as vehicle_model
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN technicians t ON j.technician_id = t.id
            LEFT JOIN users u ON j.created_by = u.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            WHERE 1=1
        `;
        const params = [];

        if (user && user.role === 'employee') {
            sql += ` AND (t.user_id = ? OR j.technician_id IS NULL)`;
            params.push(user.id);
        }

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
                   t.name as technician_name,
                   v.make as vehicle_make,
                   v.model as vehicle_model
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN technicians t ON j.technician_id = t.id
            LEFT JOIN vehicles v ON j.vehicle_id = v.id
            WHERE j.id = ?
        `, [id]);
    },

    async create({ customer_id, vehicle_id, technician_id, created_by, device_name, problem_description, priority, estimated_cost }) {
        const result = await runQuery(
            `INSERT INTO jobs (customer_id, vehicle_id, technician_id, created_by, device_name, problem_description, priority, estimated_cost) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [customer_id, vehicle_id || null, technician_id || null, created_by, device_name, problem_description, priority || 'medium', estimated_cost || 0]
        );
        return this.findById(result.lastInsertRowid);
    },

    async update(id, { vehicle_id, technician_id, status, priority, date_out, estimated_cost, final_cost, device_name, problem_description }) {
        await runQuery(
            `UPDATE jobs SET 
                vehicle_id = COALESCE(?, vehicle_id),
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
            [vehicle_id !== undefined ? (vehicle_id || null) : null, technician_id || null, status || null, priority || null, date_out || null, estimated_cost !== undefined ? estimated_cost : null, final_cost !== undefined ? final_cost : null, device_name || null, problem_description || null, id]
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
        const db = require('../config/db');
        const [customersRow, vehiclesRow, jobsRow, revenueRow] = await Promise.all([
            db.queryOne('SELECT COUNT(*) as c FROM customers'),
            db.queryOne('SELECT COUNT(*) as c FROM vehicles'),
            db.queryOne(`
                SELECT 
                    SUM(CASE WHEN status NOT IN ('completed', 'delivered') THEN 1 ELSE 0 END) as active_jobs,
                    SUM(CASE WHEN status IN ('completed', 'delivered') THEN 1 ELSE 0 END) as completed_jobs
                FROM jobs
            `),
            db.queryOne(`
                SELECT SUM(total_amount) as total 
                FROM invoices 
                WHERE DATE_FORMAT(issued_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
            `)
        ]);

        return {
            total_customers: customersRow?.c || 0,
            total_vehicles: vehiclesRow?.c || 0,
            active_jobs: jobsRow?.active_jobs || 0,
            completed_jobs: jobsRow?.completed_jobs || 0,
            monthly_revenue: revenueRow?.total || 0
        };
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
    },

    async getDailyStats(date) {
        const revenueRow = await queryOne(`SELECT SUM(total_amount) as total FROM invoices WHERE DATE(issued_at) = ?`, [date]);
        return { total_revenue: revenueRow?.total || 0 };
    },

    async getMonthlyStats(year, month) {
        const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
        const revenueRow = await queryOne(`SELECT SUM(total_amount) as total FROM invoices WHERE DATE_FORMAT(issued_at, '%Y-%m') = ?`, [monthStr]);
        const topVehicleRow = await queryOne(`SELECT v.make, COUNT(j.id) as count FROM jobs j JOIN vehicles v ON j.vehicle_id = v.id WHERE DATE_FORMAT(j.date_in, '%Y-%m') = ? GROUP BY v.make ORDER BY count DESC LIMIT 1`, [monthStr]);
        const topPartRow = await queryOne(`SELECT p.name, SUM(jp.quantity_used) as count FROM job_parts jp JOIN jobs j ON jp.job_id = j.id JOIN parts p ON jp.part_id = p.id WHERE DATE_FORMAT(j.date_in, '%Y-%m') = ? GROUP BY p.id ORDER BY count DESC LIMIT 1`, [monthStr]);
        
        return {
            total_revenue: revenueRow?.total || 0,
            top_vehicle: topVehicleRow ? `${topVehicleRow.make} (${topVehicleRow.count})` : 'N/A',
            top_part: topPartRow ? `${topPartRow.name} (${topPartRow.count})` : 'N/A'
        };
    }
};

module.exports = JobModel;
