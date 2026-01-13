const { run, get, all, getDb } = require('../config/database');

class EntryModel {
    static async create(fileId, rowNumber, data) {
        const result = await run(
            'INSERT INTO entries (excel_file_id, row_number, data) VALUES (?, ?, ?)',
            [fileId, rowNumber, JSON.stringify(data)]
        );
        return this.findById(result.lastID);
    }

    static async createBatch(fileId, entries) {
        // sqlite3 handles transactions differently than better-sqlite3
        // We'll use database serialization for simple batch inserts
        const db = getDb();

        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                const stmt = db.prepare('INSERT INTO entries (excel_file_id, row_number, data) VALUES (?, ?, ?)');

                for (const entry of entries) {
                    stmt.run(fileId, entry.rowNumber, JSON.stringify(entry.data));
                }

                stmt.finalize();

                db.run('COMMIT', async (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(await this.findByFileId(fileId));
                    }
                });
            });
        });
    }

    static async findById(id) {
        const row = await get('SELECT * FROM entries WHERE id = ?', [id]);
        if (!row) return null;
        return {
            ...row,
            data: JSON.parse(row.data)
        };
    }

    static async findByFileId(fileId) {
        const rows = await all(
            `SELECT e.*, 
                    COUNT(r.id) as response_count,
                    SUM(CASE WHEN r.status = 'approved' THEN 1 ELSE 0 END) as approved_count
             FROM entries e 
             LEFT JOIN ai_responses r ON e.id = r.entry_id 
             WHERE e.excel_file_id = ? 
             GROUP BY e.id 
             ORDER BY e.row_number ASC`,
            [fileId]
        );
        return rows.map(row => ({
            ...row,
            data: JSON.parse(row.data),
            response_count: row.response_count,
            approved_count: row.approved_count || 0
        }));
    }

    static async delete(id) {
        const result = await run('DELETE FROM entries WHERE id = ?', [id]);
        return result.changes > 0;
    }
}

module.exports = EntryModel;
