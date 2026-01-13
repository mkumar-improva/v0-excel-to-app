function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
        return res.status(400).json({ error: err.message });
    }

    // Custom errors
    if (err.status) {
        return res.status(err.status).json({ error: err.message });
    }

    // Database errors
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Database constraint violation' });
    }

    // Default error
    res.status(500).json({
        error: process.env.NODE_ENV === 'development'
            ? err.message
            : 'Internal server error'
    });
}

function notFoundHandler(req, res) {
    res.status(404).json({ error: 'Route not found' });
}

module.exports = {
    errorHandler,
    notFoundHandler
};
