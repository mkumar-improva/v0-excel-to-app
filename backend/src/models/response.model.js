const { run, get, all } = require('../config/database');

class ResponseModel {
    static async create(entryId, prompt, response, model = null) {
        const result = await run(
            "INSERT INTO ai_responses (entry_id, prompt, response, model, status) VALUES (?, ?, ?, ?, 'pending')",
            [entryId, prompt, response, model]
        );
        return this.findById(result.lastID);
    }

    static async findById(id) {
        return await get('SELECT * FROM ai_responses WHERE id = ?', [id]);
    }

    static async findByEntryId(entryId) {
        return await all(
            'SELECT * FROM ai_responses WHERE entry_id = ? ORDER BY created_at DESC',
            [entryId]
        );
    }

    static async update(id, data) {
        const updates = [];
        const values = [];

        if (data.prompt !== undefined) {
            updates.push('prompt = ?');
            values.push(data.prompt);
        }
        if (data.response !== undefined) {
            updates.push('response = ?');
            values.push(data.response);
        }
        if (data.model !== undefined) {
            updates.push('model = ?');
            values.push(data.model);
        }
        if (data.status !== undefined) {
            updates.push('status = ?');
            values.push(data.status);
        }
        if (data.approved_at !== undefined) {
            updates.push('approved_at = ?');
            values.push(data.approved_at);
        }

        if (updates.length === 0) return this.findById(id);

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        await run(
            `UPDATE ai_responses SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        return this.findById(id);
    }

    static async delete(id) {
        const result = await run('DELETE FROM ai_responses WHERE id = ?', [id]);
        return result.changes > 0;
    }
}

module.exports = ResponseModel;
