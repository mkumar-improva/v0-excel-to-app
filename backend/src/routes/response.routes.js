const express = require('express');
const { body, param, validationResult } = require('express-validator');
const ResponseModel = require('../models/response.model');
const EntryModel = require('../models/entry.model');

const router = express.Router();

const validateResponse = [
    body('prompt').notEmpty().withMessage('Prompt is required'),
    body('response').notEmpty().withMessage('Response is required'),
    body('model').optional().trim()
];

const validateId = [
    param('id').isInt({ min: 1 }).withMessage('Invalid ID')
];

const checkValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// GET /api/entries/:id/responses - List AI responses for an entry
router.get('/entries/:id/responses', validateId, checkValidation, async (req, res, next) => {
    try {
        const responses = await ResponseModel.findByEntryId(req.params.id);
        res.json({ responses });
    } catch (error) {
        next(error);
    }
});

// POST /api/entries/:id/responses - Create AI response
router.post('/entries/:id/responses', validateId, validateResponse, checkValidation, async (req, res, next) => {
    try {
        const entryId = parseInt(req.params.id);

        // Verify entry exists
        const entry = await EntryModel.findById(entryId);
        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        const { prompt, response, model } = req.body;
        const aiResponse = await ResponseModel.create(entryId, prompt, response, model);

        res.status(201).json({ response: aiResponse });
    } catch (error) {
        next(error);
    }
});

// GET /api/responses/:id - Get response by ID
router.get('/responses/:id', validateId, checkValidation, async (req, res, next) => {
    try {
        const response = await ResponseModel.findById(req.params.id);
        if (!response) {
            return res.status(404).json({ error: 'Response not found' });
        }
        res.json({ response });
    } catch (error) {
        next(error);
    }
});

// PUT /api/responses/:id - Update response
// Update PUT route to accept status
router.put('/responses/:id', validateId, [
    body('prompt').optional(),
    body('response').optional(),
    body('model').optional(),
    body('status').optional().isIn(['pending', 'approved', 'rejected']),
    body('approved_at').optional()
], checkValidation, async (req, res, next) => {
    try {
        const { prompt, response, model, status, approved_at } = req.body;
        const updated = await ResponseModel.update(req.params.id, { prompt, response, model, status, approved_at });

        if (!updated) {
            return res.status(404).json({ error: 'Response not found' });
        }

        res.json({ response: updated });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/responses/:id - Delete response
router.delete('/responses/:id', validateId, checkValidation, async (req, res, next) => {
    try {
        const deleted = await ResponseModel.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Response not found' });
        }
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
