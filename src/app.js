const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const noestRoutes = require('./routes/noest.routes');
const loggerMiddleware = require('./middleware/loggerMiddleware');

const app = express();

app.use(loggerMiddleware); // Add the logger as the VERY FIRST middleware
app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', orderRoutes);
app.use('/api/noest', noestRoutes);

// --- GLOBAL ERROR HANDLER ---
// This middleware catches any error thrown in routes
app.use((err, req, res, next) => {
    console.error('🔴 [EXPRESS ERROR]', err);
    res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur',
        message: err.message
    });
});

// --- PREVENT NODE.JS FROM CRASHING ---
// Catches promises that fail without a catch block
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔴 [CRASH PREVENTED] Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process
});

// Catches synchronous errors outside of routes
process.on('uncaughtException', (err) => {
    console.error('🔴 [CRASH PREVENTED] Uncaught Exception:', err);
    // Don't exit the process
});

// Export app for Vercel
module.exports = app;

// Only listen if run directly (local development)
if (require.main === module) {
    const server = app.listen(config.PORT, () => {
        console.log(`Server running on http://localhost:${config.PORT}`);
    });

    server.on('error', (err) => {
        console.error('Server failed to start:', err);
    });
}
