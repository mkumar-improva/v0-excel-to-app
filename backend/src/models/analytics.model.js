const db = require('../config/database');

class AnalyticsModel {
    /**
     * Get comprehensive analytics for a project (OPTIMIZED)
     * @param {number} projectId - Project ID
     * @param {string} timeRange - '7d', '30d', or 'all'
     * @returns {Promise<Object>} Analytics data
     */
    static async getProjectAnalytics(projectId, timeRange = '7d') {
        // Calculate date threshold based on time range
        let dateThreshold;
        const now = new Date();

        switch (timeRange) {
            case '7d':
                dateThreshold = new Date(now.setDate(now.getDate() - 7));
                break;
            case '30d':
                dateThreshold = new Date(now.setDate(now.getDate() - 30));
                break;
            case 'all':
                dateThreshold = new Date('2000-01-01'); // Far past date
                break;
            default:
                dateThreshold = new Date(now.setDate(now.getDate() - 7));
        }

        const dateThresholdStr = dateThreshold.toISOString();

        try {
            // Run all queries in parallel for better performance
            const [totalMetrics, entryMetrics, timeSeriesData, statusDistribution, dailyActivity] = await Promise.all([
                this.getTotalMetrics(projectId, dateThresholdStr),
                this.getEntryMetrics(projectId),
                this.getTimeSeriesData(projectId, dateThresholdStr),
                this.getStatusDistribution(projectId, dateThresholdStr),
                this.getDailyActivity(projectId, dateThresholdStr)
            ]);

            // Calculate averages
            const avgTokensPerResponse = totalMetrics.totalResponses > 0
                ? totalMetrics.totalTokens / totalMetrics.totalResponses
                : 0;

            const avgCostPerResponse = totalMetrics.totalResponses > 0
                ? totalMetrics.totalCost / totalMetrics.totalResponses
                : 0;

            return {
                totalResponses: totalMetrics.totalResponses,
                approvedResponses: totalMetrics.approvedResponses,
                pendingResponses: totalMetrics.pendingResponses,
                rejectedResponses: totalMetrics.rejectedResponses,
                totalTokens: totalMetrics.totalTokens,
                totalCost: totalMetrics.totalCost,
                avgTokensPerResponse: Math.round(avgTokensPerResponse),
                avgCostPerResponse: parseFloat(avgCostPerResponse.toFixed(3)),
                // Entry metrics
                totalEntries: entryMetrics.totalEntries,
                entriesWithResponses: entryMetrics.entriesWithResponses,
                entriesApproved: entryMetrics.entriesApproved,
                timeSeriesData,
                statusDistribution,
                dailyActivity
            };
        } catch (error) {
            console.error('Error in getProjectAnalytics:', error);
            throw error;
        }
    }

    /**
     * Get entry coverage metrics
     */
    static async getEntryMetrics(projectId) {
        const query = `
            SELECT 
                COUNT(DISTINCT e.id) as total_entries,
                COUNT(DISTINCT CASE WHEN ar.id IS NOT NULL THEN e.id END) as entries_with_responses,
                COUNT(DISTINCT CASE WHEN ar.status = 'approved' THEN e.id END) as entries_approved
            FROM entries e
            LEFT JOIN ai_responses ar ON e.id = ar.entry_id
            WHERE e.excel_file_id IN (
                SELECT ef.id FROM excel_files ef
                WHERE ef.project_id = ?
            )
        `;

        const row = await db.get(query, [projectId]);
        return {
            totalEntries: row?.total_entries || 0,
            entriesWithResponses: row?.entries_with_responses || 0,
            entriesApproved: row?.entries_approved || 0
        };
    }

    /**
     * Get total metrics for a project (OPTIMIZED)
     */
    static async getTotalMetrics(projectId, dateThreshold) {
        const query = `
            SELECT 
                COUNT(*) as total_responses,
                SUM(CASE WHEN ar.status = 'approved' THEN 1 ELSE 0 END) as approved_responses,
                SUM(CASE WHEN ar.status = 'pending' THEN 1 ELSE 0 END) as pending_responses,
                SUM(CASE WHEN ar.status = 'rejected' THEN 1 ELSE 0 END) as rejected_responses,
                COALESCE(SUM(ar.total_tokens), 0) as total_tokens,
                COALESCE(SUM(ar.estimated_cost), 0) as total_cost
            FROM ai_responses ar
            WHERE ar.entry_id IN (
                SELECT e.id FROM entries e
                WHERE e.excel_file_id IN (
                    SELECT ef.id FROM excel_files ef
                    WHERE ef.project_id = ?
                )
            )
            AND ar.created_at >= ?
        `;

        const row = await db.get(query, [projectId, dateThreshold]);
        return {
            totalResponses: row?.total_responses || 0,
            approvedResponses: row?.approved_responses || 0,
            pendingResponses: row?.pending_responses || 0,
            rejectedResponses: row?.rejected_responses || 0,
            totalTokens: row?.total_tokens || 0,
            totalCost: row?.total_cost || 0
        };
    }

    /**
     * Get time series data (daily breakdown) (OPTIMIZED)
     */
    static async getTimeSeriesData(projectId, dateThreshold) {
        const query = `
            SELECT 
                DATE(ar.created_at) as date,
                COUNT(*) as responses,
                COALESCE(SUM(ar.total_tokens), 0) as tokens,
                COALESCE(SUM(ar.estimated_cost), 0) as cost
            FROM ai_responses ar
            WHERE ar.entry_id IN (
                SELECT e.id FROM entries e
                WHERE e.excel_file_id IN (
                    SELECT ef.id FROM excel_files ef
                    WHERE ef.project_id = ?
                )
            )
            AND ar.created_at >= ?
            GROUP BY DATE(ar.created_at)
            ORDER BY date ASC
        `;

        const rows = await db.all(query, [projectId, dateThreshold]);
        return rows.map(row => ({
            date: row.date,
            responses: row.responses,
            tokens: row.tokens,
            cost: parseFloat((row.cost || 0).toFixed(2))
        }));
    }

    /**
     * Get status distribution (OPTIMIZED)
     */
    static async getStatusDistribution(projectId, dateThreshold) {
        const query = `
            SELECT 
                ar.status,
                COUNT(*) as count
            FROM ai_responses ar
            WHERE ar.entry_id IN (
                SELECT e.id FROM entries e
                WHERE e.excel_file_id IN (
                    SELECT ef.id FROM excel_files ef
                    WHERE ef.project_id = ?
                )
            )
            AND ar.created_at >= ?
            GROUP BY ar.status
        `;

        const colorMap = {
            'approved': 'oklch(0.62 0.16 145)',      // Success green
            'pending': 'oklch(0.70 0.16 55)',        // Warning amber
            'rejected': 'oklch(0.577 0.245 27.325)'  // Destructive red
        };

        const rows = await db.all(query, [projectId, dateThreshold]);
        return rows.map(row => ({
            name: row.status.charAt(0).toUpperCase() + row.status.slice(1),
            value: row.count,
            color: colorMap[row.status] || 'oklch(0.551 0.027 264.364)' // Muted foreground
        }));
    }

    /**
     * Get daily activity (generated vs approved) (OPTIMIZED)
     */
    static async getDailyActivity(projectId, dateThreshold) {
        const query = `
            SELECT 
                DATE(ar.created_at) as date,
                COUNT(*) as generated,
                SUM(CASE WHEN ar.status = 'approved' THEN 1 ELSE 0 END) as approved
            FROM ai_responses ar
            WHERE ar.entry_id IN (
                SELECT e.id FROM entries e
                WHERE e.excel_file_id IN (
                    SELECT ef.id FROM excel_files ef
                    WHERE ef.project_id = ?
                )
            )
            AND ar.created_at >= ?
            GROUP BY DATE(ar.created_at)
            ORDER BY date DESC
            LIMIT 7
        `;

        const rows = await db.all(query, [projectId, dateThreshold]);
        // Reverse to get chronological order
        return rows.reverse().map(row => ({
            date: row.date,
            generated: row.generated,
            approved: row.approved
        }));
    }
}

module.exports = AnalyticsModel;
