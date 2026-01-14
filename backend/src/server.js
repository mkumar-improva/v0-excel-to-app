require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

// Import routes
const projectRoutes = require('./routes/project.routes');
const fileRoutes = require('./routes/file.routes');
const entryRoutes = require('./routes/entry.routes');
const responseRoutes = require('./routes/response.routes');
const searchRoutes = require('./routes/search.routes');
const analyticsRoutes = require('./routes/analytics.routes');


// Initialize database
require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend server is running' });
});

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api', fileRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api', responseRoutes);
app.use('/api', searchRoutes);
app.use('/api', analyticsRoutes);


// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    const { closeDb } = require('./config/database');
    closeDb();
    process.exit(0);
});
