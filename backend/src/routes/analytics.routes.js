const express = require('express');
const router = express.Router();
const { param, query, validationResult } = require('express-validator');
const AnalyticsModel = require('../models/analytics.model');

// Validation middleware
const validateId = [
    param('id').isInt({ min: 1 }).withMessage('Invalid project ID')
];

const validateTimeRange = [
    query('range').optional().isIn(['7d', '30d', 'all']).withMessage('Invalid time range. Must be 7d, 30d, or all')
];

const checkValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

/**
 * GET /api/projects/:id/analytics
 * Get comprehensive analytics for a project
 */
router.get('/projects/:id/analytics', validateId, validateTimeRange, checkValidation, async (req, res, next) => {
    try {
        const projectId = parseInt(req.params.id);
        const timeRange = req.query.range || '7d';

        console.log(`📊 Fetching analytics for project ${projectId}, range: ${timeRange}`);

        const analytics = await AnalyticsModel.getProjectAnalytics(projectId, timeRange);

        console.log(`✅ Analytics retrieved: ${analytics.totalResponses} responses, ${analytics.totalTokens} tokens, $${analytics.totalCost}`);

        res.json({ analytics });
    } catch (error) {
        console.error('❌ Error fetching analytics:', error);
        next(error);
    }
});

/**
 * GET /api/projects/:id/analytics/summary
 * Get quick summary metrics (for dashboard cards)
 */
router.get('/projects/:id/analytics/summary', validateId, checkValidation, async (req, res, next) => {
    try {
        const projectId = parseInt(req.params.id);

        // Get all-time metrics for summary
        const analytics = await AnalyticsModel.getProjectAnalytics(projectId, 'all');

        const summary = {
            totalResponses: analytics.totalResponses,
            approvedResponses: analytics.approvedResponses,
            pendingResponses: analytics.pendingResponses,
            approvalRate: analytics.totalResponses > 0
                ? ((analytics.approvedResponses / analytics.totalResponses) * 100).toFixed(1)
                : 0,
            totalTokens: analytics.totalTokens,
            totalCost: analytics.totalCost,
            avgTokensPerResponse: analytics.avgTokensPerResponse,
            avgCostPerResponse: analytics.avgCostPerResponse
        };

        res.json({ summary });
    } catch (error) {
        console.error('❌ Error fetching analytics summary:', error);
        next(error);
    }
});

module.exports = router;
