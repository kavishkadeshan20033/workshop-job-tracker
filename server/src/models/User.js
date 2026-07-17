const { queryAll, queryOne, runQuery } = require('../config/db');
const bcrypt = require('bcryptjs');

const UserModel = {
    findAll() {
        return queryAll('SELECT id, username, email, full_name, phone, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC');
    },

    findById(id) {
        return queryOne('SELECT id, username, email, full_name, phone, role, is_active, created_at, updated_at FROM users WHERE id = ?', [id]);
    },

    findByUsername(username) {
        return queryOne('SELECT * FROM users WHERE username = ?', [username]);
    },

    findByEmail(email) {
        return queryOne('SELECT * FROM users WHERE email = ?', [email]);
    },

    create({ username, email, password, full_name, phone, role = 'employee' }) {
        const password_hash = bcrypt.hashSync(password, 10);
        const result = runQuery(
            'INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, password_hash, full_name, phone || null, role]
        );
        return this.findById(result.lastInsertRowid);
    },

    update(id, { email, full_name, phone, role, is_active, password }) {
        if (password) {
            const password_hash = bcrypt.hashSync(password, 10);
            runQuery(
                `UPDATE users SET email = COALESCE(?, email), full_name = COALESCE(?, full_name), phone = COALESCE(?, phone),
                role = COALESCE(?, role), is_active = COALESCE(?, is_active), password_hash = ?, updated_at = datetime('now')
                WHERE id = ?`,
                [email || null, full_name || null, phone || null, role || null, is_active !== undefined ? is_active : null, password_hash, id]
            );
        } else {
            runQuery(
                `UPDATE users SET email = COALESCE(?, email), full_name = COALESCE(?, full_name), phone = COALESCE(?, phone),
                role = COALESCE(?, role), is_active = COALESCE(?, is_active), updated_at = datetime('now')
                WHERE id = ?`,
                [email || null, full_name || null, phone || null, role || null, is_active !== undefined ? is_active : null, id]
            );
        }
        return this.findById(id);
    },

    delete(id) {
        return runQuery('DELETE FROM users WHERE id = ?', [id]);
    },
};

module.exports = UserModel;
