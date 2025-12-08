const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const noestRoutes = require('./routes/noest.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', orderRoutes);
app.use('/api/noest', noestRoutes);

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
