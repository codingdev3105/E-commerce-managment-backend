const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me';

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { code, role, iat, exp }
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
