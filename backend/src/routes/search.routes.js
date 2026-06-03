const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { enhancedSearch } = require('../services/parallel-search.service');

/**
 * POST /api/search
 * Execute a web search using Parallel AI and return formatted results
 */
router.post('/search',
    [
        body('prompt')
            .isString()
            .trim()
            .isLength({ min: 1 })
            .withMessage('Prompt is required'),
        body('queries')
            .optional()
            .isArray()
            .withMessage('Queries must be an array'),
        body('maxResults')
            .optional()
            .isInt({ min: 1, max: 20 })
            .withMessage('Max results must be between 1 and 20'),
        body('maxCharsPerResult')
            .optional()
            .isInt({ min: 1000, max: 50000 })
            .withMessage('Max chars must be between 1000 and 50000')
    ],
    async (req, res) => {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { prompt, promptTemplate, queries, maxResults, maxCharsPerResult } = req.body;

            // Execute search
            const searchResult = await enhancedSearch(prompt, {
                queries,
                promptTemplate,
                maxResults,
                maxCharsPerResult
            });

            // Return results
            res.json({
                success: true,
                prompt,
                queries: searchResult.queries,
                formattedText: searchResult.formattedText,
                resultsCount: searchResult.rawResults?.result?.evidence?.length || searchResult.rawResults?.results?.length || 0,
                searchId: searchResult.rawResults?.search_id,
                rawResults: searchResult.rawResults
            });

        } catch (error) {
            console.error('Search API Error:', error);

            // Check if it's a configuration error
            if (error.message?.includes('PARALLEL_API_KEY')) {
                return res.status(503).json({
                    error: 'Search service not configured',
                    message: 'Parallel API key is missing. Please configure PARALLEL_API_KEY in environment variables.'
                });
            }

            res.status(500).json({
                error: 'Search failed',
                message: error.message
            });
        }
    }
);

/**
 * GET /api/search/health
 * Check if search service is configured
 */
router.get('/search/health', (req, res) => {
    const isConfigured = !!process.env.PARALLEL_API_KEY;

    res.json({
        configured: isConfigured,
        service: 'Parallel AI Search',
        version: 'v1beta',
        message: isConfigured
            ? 'Search service is ready'
            : 'PARALLEL_API_KEY not configured'
    });
});

module.exports = router;
