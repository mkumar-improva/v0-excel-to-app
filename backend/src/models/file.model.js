const { run, get, all } = require('../config/database');

class FileModel {
    static async create(projectId, fileName, filePath, columns) {
        const result = await run(
            'INSERT INTO excel_files (project_id, file_name, file_path, columns) VALUES (?, ?, ?, ?)',
            [projectId, fileName, filePath, JSON.stringify(columns)]
        );
        return this.findById(result.lastID);
    }

    static async findById(id) {
        const row = await get('SELECT * FROM excel_files WHERE id = ?', [id]);
        if (!row) return null;
        return {
            ...row,
            columns: JSON.parse(row.columns)
        };
    }

    static async findByProjectId(projectId) {
        const rows = await all(
            'SELECT * FROM excel_files WHERE project_id = ? ORDER BY uploaded_at DESC',
            [projectId]
        );
        return rows.map(row => ({
            ...row,
            columns: JSON.parse(row.columns)
        }));
    }

    static async delete(id) {
        const result = await run('DELETE FROM excel_files WHERE id = ?', [id]);
        return result.changes > 0;
    }
}

module.exports = FileModel;
