const { queryOne, runQuery } = require('../config/db');

let tableEnsured = false;

const PasswordResetModel = {
    async ensureTable() {
        if (tableEnsured) return;
        try {
            await runQuery(`
                CREATE TABLE IF NOT EXISTS password_resets (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    code VARCHAR(50) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    used TINYINT(1) NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT NOW(),
                    INDEX idx_reset_user (user_id),
                    INDEX idx_reset_code (code)
                )
            `);
            tableEnsured = true;
        } catch (err) {
            console.error('Failed to ensure password_resets table:', err.message);
        }
    },

    async create({ user_id, email, code, minutes = 15 }) {
        await this.ensureTable();
        // Invalidate any previously unused codes for this user
        await runQuery(
            'UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0',
            [user_id]
        );

        const result = await runQuery(
            'INSERT INTO password_resets (user_id, email, code, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
            [user_id, email, code, minutes]
        );

        return result.lastInsertRowid;
    },

    async findValid({ user_id, code }) {
        await this.ensureTable();
        return queryOne(
            'SELECT * FROM password_resets WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
            [user_id, code]
        );
    },

    async markUsed(id) {
        await this.ensureTable();
        return runQuery(
            'UPDATE password_resets SET used = 1 WHERE id = ?',
            [id]
        );
    },
};

module.exports = PasswordResetModel;
