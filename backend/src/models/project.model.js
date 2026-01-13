const { run, get, all } = require('../config/database');

class ProjectModel {
    static async create(name, description = null, promptTemplate = null) {
        const result = await run(
            'INSERT INTO projects (name, description, prompt_template) VALUES (?, ?, ?)',
            [name, description, promptTemplate]
        );
        return this.findById(result.lastID);
    }

    static async findById(id) {
        return await get('SELECT * FROM projects WHERE id = ?', [id]);
    }

    static async findAll() {
        return await all('SELECT * FROM projects ORDER BY created_at DESC');
    }

    static async update(id, data) {
        const updates = [];
        const values = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (data.description !== undefined) {
            updates.push('description = ?');
            values.push(data.description);
        }
        if (data.prompt_template !== undefined) {
            updates.push('prompt_template = ?');
            values.push(data.prompt_template);
        }

        if (updates.length === 0) return this.findById(id);

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        await run(
            `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        return this.findById(id);
    }

    static async delete(id) {
        const result = await run('DELETE FROM projects WHERE id = ?', [id]);
        return result.changes > 0;
    }
}

module.exports = ProjectModel;
