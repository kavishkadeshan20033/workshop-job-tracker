const { queryAll, queryOne, runQuery } = require('../config/db');

const JobNoteModel = {
    async findByJobId(job_id) {
        return queryAll(`
            SELECT n.*, u.full_name as author_name 
            FROM job_notes n
            LEFT JOIN users u ON n.employee_id = u.id
            WHERE n.job_id = ?
            ORDER BY n.created_at ASC
        `, [job_id]);
    },

    async create({ job_id, employee_id, description }) {
        const result = await runQuery(
            'INSERT INTO job_notes (job_id, employee_id, description) VALUES (?, ?, ?)',
            [job_id, employee_id, description]
        );
        return queryOne('SELECT * FROM job_notes WHERE id = ?', [result.lastInsertRowid]);
    }
};

module.exports = JobNoteModel;
