const { queryAll, runQuery } = require('../config/db');

const AuditModel = {
    async log({ user_id, action, entity, entity_id, details, ip_address }) {
        return runQuery(
            'INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
            [user_id, action, entity, entity_id, details || null, ip_address || null]
        );
    },

    async findAll({ limit = 50, offset = 0, entity, user_id } = {}) {
        let query = `SELECT al.*, u.username, u.full_name
            FROM audit_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (entity) { query += ` AND al.entity = $${idx++}`; params.push(entity); }
        if (user_id) { query += ` AND al.user_id = $${idx++}`; params.push(user_id); }
        query += ` ORDER BY al.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
        params.push(limit, offset);
        return queryAll(query, params);
    },
};

module.exports = AuditModel;
