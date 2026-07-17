const { queryAll, queryOne, runQuery } = require('../config/db');

const TechnicianModel = {
    findAll() {
        return queryAll(`
            SELECT t.*, u.email, u.full_name as user_name 
            FROM technicians t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.name ASC
        `);
    },

    findById(id) {
        return queryOne('SELECT * FROM technicians WHERE id = ?', [id]);
    },
    
    findByUserId(user_id) {
        return queryOne('SELECT * FROM technicians WHERE user_id = ?', [user_id]);
    },

    create({ user_id, name, specialization, phone }) {
        const result = runQuery(
            'INSERT INTO technicians (user_id, name, specialization, phone) VALUES (?, ?, ?, ?)',
            [user_id || null, name, specialization || null, phone || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    update(id, { user_id, name, specialization, phone }) {
        runQuery(
            `UPDATE technicians SET user_id = COALESCE(?, user_id), name = COALESCE(?, name),
            specialization = COALESCE(?, specialization), phone = COALESCE(?, phone)
            WHERE id = ?`,
            [user_id || null, name || null, specialization || null, phone || null, id]
        );
        return this.findById(id);
    },

    delete(id) {
        return runQuery('DELETE FROM technicians WHERE id = ?', [id]);
    },
};

module.exports = TechnicianModel;
