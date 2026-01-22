const { run, get, all } = require('../config/database');

class ResponseModel {
    static async create(entryId, prompt, response, model = null, inputTokens = null, outputTokens = null, totalTokens = null, estimatedCost = null) {
        // Debug: Log what we're receiving
        console.log('📊 ResponseModel.create received:');
        console.log('   Input Tokens:', inputTokens);
        console.log('   Output Tokens:', outputTokens);
        console.log('   Total Tokens:', totalTokens);
        console.log('   Estimated Cost:', estimatedCost);

        const result = await run(
            "INSERT INTO ai_responses (entry_id, prompt, response, model, input_tokens, output_tokens, total_tokens, estimated_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')",
            [entryId, prompt, response, model, inputTokens, outputTokens, totalTokens, estimatedCost]
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

    static async findApprovedByFileId(fileId) {
        const rows = await all(
            `SELECT r.*, e.row_number, e.data as entry_data
             FROM ai_responses r
             JOIN entries e ON r.entry_id = e.id
             WHERE e.excel_file_id = ? AND r.status = 'approved'
             ORDER BY r.approved_at DESC`,
            [fileId]
        );
        return rows.map(row => ({
            ...row,
            entry_data: JSON.parse(row.entry_data)
        }));
    }
}

module.exports = ResponseModel;
