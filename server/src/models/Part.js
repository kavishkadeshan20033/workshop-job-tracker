const { queryAll, queryOne, runQuery } = require('../config/db');

const PartModel = {
    async findAll(search = '') {
        if (search) {
            return queryAll(
                `SELECT * FROM parts WHERE name ILIKE $1 OR part_number ILIKE $1 OR category ILIKE $1 OR supplier ILIKE $1 ORDER BY name ASC`,
                [`%${search}%`]
            );
        }
        return queryAll('SELECT * FROM parts ORDER BY name ASC');
    },

    async getLowStock() {
        return queryAll('SELECT * FROM parts WHERE stock_qty <= reorder_level ORDER BY stock_qty ASC');
    },

    async findById(id) {
        return queryOne('SELECT * FROM parts WHERE id = $1', [id]);
    },

    async create({ name, part_number, stock_qty, unit_price, reorder_level, supplier, category }) {
        const result = await runQuery(
            'INSERT INTO parts (name, part_number, stock_qty, unit_price, reorder_level, supplier, category) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [name, part_number || null, stock_qty !== undefined ? stock_qty : 0, unit_price !== undefined ? unit_price : 0, reorder_level !== undefined ? reorder_level : 5, supplier || null, category || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    async update(id, { name, part_number, stock_qty, unit_price, reorder_level, supplier, category }) {
        await runQuery(
            `UPDATE parts SET
                name = COALESCE($1, name),
                part_number = COALESCE($2, part_number),
                stock_qty = COALESCE($3, stock_qty),
                unit_price = COALESCE($4, unit_price),
                reorder_level = COALESCE($5, reorder_level),
                supplier = COALESCE($6, supplier),
                category = COALESCE($7, category),
                updated_at = NOW()
            WHERE id = $8`,
            [name || null, part_number || null, stock_qty !== undefined ? stock_qty : null, unit_price !== undefined ? unit_price : null, reorder_level !== undefined ? reorder_level : null, supplier || null, category || null, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        return runQuery('DELETE FROM parts WHERE id = $1', [id]);
    },
};

module.exports = PartModel;
