const { queryAll, queryOne, runQuery } = require('../config/db');

const TechnicianModel = {
    async findAll() {
        return queryAll(`
            SELECT t.*, u.email, u.full_name as user_name 
            FROM technicians t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.name ASC
        `);
    },

    async findById(id) {
        return queryOne('SELECT * FROM technicians WHERE id = ?', [id]);
    },
    
    async findByUserId(user_id) {
        return queryOne('SELECT * FROM technicians WHERE user_id = ?', [user_id]);
    },

    async create({ user_id, name, specialization, phone }) {
        const result = await runQuery(
            'INSERT INTO technicians (user_id, name, specialization, phone) VALUES (?, ?, ?, ?)',
            [user_id || null, name, specialization || null, phone || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    async update(id, { user_id, name, specialization, phone }) {
        await runQuery(
            `UPDATE technicians SET user_id = COALESCE(?, user_id), name = COALESCE(?, name),
            specialization = COALESCE(?, specialization), phone = COALESCE(?, phone)
            WHERE id = ?`,
            [user_id || null, name || null, specialization || null, phone || null, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        return runQuery('DELETE FROM technicians WHERE id = ?', [id]);
    },
};

module.exports = TechnicianModel;
