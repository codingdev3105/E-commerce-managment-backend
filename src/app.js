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

const server = app.listen(config.PORT, () => {
    console.log(`Server running on http://localhost:${config.PORT}`);
});

// Force keep-alive to prevent process exit (debugging measure)
setInterval(() => { }, 10000); // 10 seconds

server.on('error', (err) => {
    console.error('Server failed to start:', err);
});
