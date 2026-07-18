const { queryAll, queryOne, runQuery } = require('../config/db');
const bcrypt = require('bcryptjs');

const UserModel = {
    async findAll() {
        return queryAll('SELECT id, username, email, full_name, phone, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC');
    },

    async findById(id) {
        return queryOne('SELECT id, username, email, full_name, phone, role, is_active, created_at, updated_at FROM users WHERE id = $1', [id]);
    },

    async findByUsername(username) {
        return queryOne('SELECT * FROM users WHERE username = $1', [username]);
    },

    async findByEmail(email) {
        return queryOne('SELECT * FROM users WHERE email = $1', [email]);
    },

    async create({ username, email, password, full_name, phone, role = 'employee' }) {
        const password_hash = bcrypt.hashSync(password, 10);
        const result = await runQuery(
            'INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [username, email, password_hash, full_name, phone || null, role]
        );
        return this.findById(result.lastInsertRowid);
    },

    async update(id, { email, full_name, phone, role, is_active, password }) {
        if (password) {
            const password_hash = bcrypt.hashSync(password, 10);
            await runQuery(
                `UPDATE users SET
                    email = COALESCE($1, email),
                    full_name = COALESCE($2, full_name),
                    phone = COALESCE($3, phone),
                    role = COALESCE($4, role),
                    is_active = COALESCE($5, is_active),
                    password_hash = $6,
                    updated_at = NOW()
                WHERE id = $7`,
                [email || null, full_name || null, phone || null, role || null, is_active !== undefined ? is_active : null, password_hash, id]
            );
        } else {
            await runQuery(
                `UPDATE users SET
                    email = COALESCE($1, email),
                    full_name = COALESCE($2, full_name),
                    phone = COALESCE($3, phone),
                    role = COALESCE($4, role),
                    is_active = COALESCE($5, is_active),
                    updated_at = NOW()
                WHERE id = $6`,
                [email || null, full_name || null, phone || null, role || null, is_active !== undefined ? is_active : null, id]
            );
        }
        return this.findById(id);
    },

    async delete(id) {
        return runQuery('DELETE FROM users WHERE id = $1', [id]);
    },
};

module.exports = UserModel;
