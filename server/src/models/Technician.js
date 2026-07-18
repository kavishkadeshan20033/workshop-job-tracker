const { queryAll, queryOne, runQuery } = require('../config/db');

const TechnicianModel = {
    async findAll() {
        return queryAll(`
            SELECT t.*, u.email, u.full_name AS user_name
            FROM technicians t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.name ASC
        `);
    },

    async findById(id) {
        return queryOne('SELECT * FROM technicians WHERE id = $1', [id]);
    },

    async findByUserId(user_id) {
        return queryOne('SELECT * FROM technicians WHERE user_id = $1', [user_id]);
    },

    async create({ user_id, name, specialization, phone }) {
        const result = await runQuery(
            'INSERT INTO technicians (user_id, name, specialization, phone) VALUES ($1, $2, $3, $4) RETURNING id',
            [user_id || null, name, specialization || null, phone || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    async update(id, { user_id, name, specialization, phone }) {
        await runQuery(
            `UPDATE technicians SET
                user_id = COALESCE($1, user_id),
                name = COALESCE($2, name),
                specialization = COALESCE($3, specialization),
                phone = COALESCE($4, phone)
            WHERE id = $5`,
            [user_id || null, name || null, specialization || null, phone || null, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        return runQuery('DELETE FROM technicians WHERE id = $1', [id]);
    },
};

module.exports = TechnicianModel;
