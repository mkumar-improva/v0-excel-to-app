const express = require('express');
const { param, validationResult } = require('express-validator');
const EntryModel = require('../models/entry.model');

const router = express.Router();

const validateId = [
    param('id').isInt({ min: 1 }).withMessage('Invalid entry ID')
];

const checkValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// GET /api/entries/:id - Get entry by ID
router.get('/:id', validateId, checkValidation, async (req, res, next) => {
    try {
        const entry = await EntryModel.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        res.json({ entry });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/entries/:id - Delete entry
router.delete('/:id', validateId, checkValidation, async (req, res, next) => {
    try {
        const deleted = await EntryModel.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
