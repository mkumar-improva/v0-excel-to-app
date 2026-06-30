const { run, get, all } = require('../config/database');

class ResponseModel {
    static async create(entryId, prompt, response, model = null, inputTokens = null, outputTokens = null, totalTokens = null, estimatedCost = null, status = 'pending', approvedAt = null) {
        // Debug: Log what we're receiving
        console.log('📊 ResponseModel.create received:');
        console.log('   Input Tokens:', inputTokens);
        console.log('   Output Tokens:', outputTokens);
        console.log('   Total Tokens:', totalTokens);
        console.log('   Estimated Cost:', estimatedCost);
        console.log('   Status:', status);
        console.log('   Approved At:', approvedAt);

        const result = await run(
            "INSERT INTO ai_responses (entry_id, prompt, response, model, input_tokens, output_tokens, total_tokens, estimated_cost, status, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [entryId, prompt, response, model, inputTokens, outputTokens, totalTokens, estimatedCost, status, approvedAt]
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

    static async deleteByEntryId(entryId) {
        const result = await run('DELETE FROM ai_responses WHERE entry_id = ?', [entryId]);
        return result.changes > 0;
    }

    static async deleteByEntryIds(entryIds) {
        if (!entryIds || entryIds.length === 0) return 0;
        const placeholders = entryIds.map(() => '?').join(',');
        const result = await run(`DELETE FROM ai_responses WHERE entry_id IN (${placeholders})`, entryIds);
        return result.changes;
    }

    static async approveByEntryIds(entryIds) {
        if (!entryIds || entryIds.length === 0) return 0;
        const placeholders = entryIds.map(() => '?').join(',');
        const now = new Date().toISOString();
        const result = await run(
            `UPDATE ai_responses SET status = 'approved', approved_at = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id IN (
                SELECT id FROM ai_responses AS a
                WHERE a.entry_id IN (${placeholders})
                AND a.created_at = (SELECT MAX(a2.created_at) FROM ai_responses AS a2 WHERE a2.entry_id = a.entry_id)
             )`,
            [now, ...entryIds]
        );
        return result.changes;
    }

    static async findApprovedByFileId(fileId) {
        const rows = await all(
            `SELECT r.*, e.row_number, e.data as entry_data
             FROM ai_responses r
             JOIN entries e ON r.entry_id = e.id
             WHERE e.excel_file_id = ? AND r.status = 'approved'
             ORDER BY e.row_number ASC`,
            [fileId]
        );
        return rows.map(row => ({
            ...row,
            entry_data: JSON.parse(row.entry_data)
        }));
    }
}

module.exports = ResponseModel;
