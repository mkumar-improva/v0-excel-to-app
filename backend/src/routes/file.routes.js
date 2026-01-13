const express = require('express');
const { param, validationResult } = require('express-validator');
const FileModel = require('../models/file.model');
const EntryModel = require('../models/entry.model');
const ProjectModel = require('../models/project.model');
const upload = require('../middleware/upload.middleware');
const { parseExcelFile } = require('../utils/excel-parser');
const { saveFile, deleteFile } = require('../utils/file-storage');

const router = express.Router();

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

// GET /api/projects/:id/files - List files in a project
router.get('/projects/:id/files', validateId, checkValidation, async (req, res, next) => {
    try {
        const files = await FileModel.findByProjectId(req.params.id);
        res.json({ files });
    } catch (error) {
        next(error);
    }
});

// POST /api/projects/:id/files - Upload Excel file
router.post('/projects/:id/files', validateId, checkValidation, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const projectId = parseInt(req.params.id);

        // Verify project exists
        const project = await ProjectModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Parse Excel file
        const excelData = parseExcelFile(req.file.buffer, req.file.originalname);

        // Save file to disk
        const filePath = saveFile(projectId, req.file.originalname, req.file.buffer);

        // Create file record in database
        const file = await FileModel.create(
            projectId,
            req.file.originalname,
            filePath,
            excelData.columns
        );

        // Create entries from Excel rows
        const entries = excelData.rows.map((row, index) => ({
            rowNumber: index + 1,
            data: row
        }));

        const createdEntries = await EntryModel.createBatch(file.id, entries);

        res.status(201).json({
            file,
            entriesCreated: createdEntries.length
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/files/:id - Get file details
router.get('/files/:id', validateId, checkValidation, async (req, res, next) => {
    try {
        const file = await FileModel.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json({ file });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/files/:id - Delete file
router.delete('/files/:id', validateId, checkValidation, async (req, res, next) => {
    try {
        const file = await FileModel.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Delete from database (cascades to entries and responses)
        const deleted = await FileModel.delete(req.params.id);

        if (deleted) {
            // Delete physical file
            deleteFile(file.file_path);
        }

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// GET /api/files/:id/entries - List entries for a file
router.get('/files/:id/entries', validateId, checkValidation, async (req, res, next) => {
    try {
        const entries = await EntryModel.findByFileId(req.params.id);
        res.json({ entries });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
