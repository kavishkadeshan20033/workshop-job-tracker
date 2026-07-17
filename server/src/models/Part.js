const { queryAll, queryOne, runQuery } = require('../config/db');

const PartModel = {
    findAll(search = '') {
        if (search) {
            return queryAll(
                `SELECT * FROM parts WHERE name LIKE ? OR part_number LIKE ? OR category LIKE ? OR supplier LIKE ? ORDER BY name ASC`,
                [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
            );
        }
        return queryAll('SELECT * FROM parts ORDER BY name ASC');
    },

    getLowStock() {
        return queryAll('SELECT * FROM parts WHERE stock_qty <= reorder_level ORDER BY stock_qty ASC');
    },

    findById(id) {
        return queryOne('SELECT * FROM parts WHERE id = ?', [id]);
    },

    create({ name, part_number, stock_qty, unit_price, reorder_level, supplier, category }) {
        const result = runQuery(
            'INSERT INTO parts (name, part_number, stock_qty, unit_price, reorder_level, supplier, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, part_number, stock_qty !== undefined ? stock_qty : 0, unit_price !== undefined ? unit_price : 0, reorder_level !== undefined ? reorder_level : 5, supplier || null, category || null]
        );
        return this.findById(result.lastInsertRowid);
    },

    update(id, { name, part_number, stock_qty, unit_price, reorder_level, supplier, category }) {
        runQuery(
            `UPDATE parts SET name = COALESCE(?, name), part_number = COALESCE(?, part_number),
            stock_qty = COALESCE(?, stock_qty), unit_price = COALESCE(?, unit_price),
            reorder_level = COALESCE(?, reorder_level), supplier = COALESCE(?, supplier), category = COALESCE(?, category),
            updated_at = datetime('now') WHERE id = ?`,
            [name || null, part_number || null, stock_qty !== undefined ? stock_qty : null, unit_price !== undefined ? unit_price : null, reorder_level !== undefined ? reorder_level : null, supplier || null, category || null, id]
        );
        return this.findById(id);
    },

    delete(id) {
        return runQuery('DELETE FROM parts WHERE id = ?', [id]);
    },
};

module.exports = PartModel;
