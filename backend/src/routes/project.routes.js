const express = require('express');
const { body, param, validationResult } = require('express-validator');
const ProjectModel = require('../models/project.model');

const router = express.Router();

// Validation middleware
const validateProject = [
    body('name').notEmpty().trim().withMessage('Project name is required'),
    body('description').optional().trim(),
    body('prompt_template').optional().trim()
];

const validateProjectUpdate = [
    body('name').optional().notEmpty().trim().withMessage('Project name cannot be empty'),
    body('description').optional().trim(),
    body('prompt_template').optional().trim()
];

const validateId = [
    param('id').isInt({ min: 1 }).withMessage('Invalid project ID')
];

const checkValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// GET /api/projects - List all projects
router.get('/', async (req, res, next) => {
    try {
        const projects = await ProjectModel.findAll();
        res.json({ projects });
    } catch (error) {
        next(error);
    }
});

// POST /api/projects - Create a new project
router.post('/', validateProject, checkValidation, async (req, res, next) => {
    try {
        const { name, description, prompt_template } = req.body;
        const project = await ProjectModel.create(name, description, prompt_template);
        res.status(201).json({ project });
    } catch (error) {
        next(error);
    }
});

// GET /api/projects/:id - Get a project by ID
router.get('/:id', validateId, checkValidation, async (req, res, next) => {
    try {
        const project = await ProjectModel.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ project });
    } catch (error) {
        next(error);
    }
});

// PUT /api/projects/:id - Update a project
router.put('/:id', validateId, validateProjectUpdate, checkValidation, async (req, res, next) => {
    try {
        const { name, description, prompt_template } = req.body;
        const project = await ProjectModel.update(req.params.id, { name, description, prompt_template });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ project });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', validateId, checkValidation, async (req, res, next) => {
    try {
        const deleted = await ProjectModel.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
