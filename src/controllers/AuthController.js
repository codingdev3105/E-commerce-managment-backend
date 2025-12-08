const jwt = require('jsonwebtoken');
const googleSheetService = require('../services/GoogleSheetService');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me';

class AuthController {

    async login(req, res) {
        try {
            const { code } = req.body;

            if (!code) {
                return res.status(400).json({ error: 'Code is required' });
            }

            // 1. Verify code against "compte" sheet
            const account = await googleSheetService.getAccount(code);

            if (!account) {
                return res.status(401).json({ error: 'Invalid Code' });
            }

            // 2. Generate Token
            const token = jwt.sign(
                { code: account.code, role: account.role },
                JWT_SECRET,
                { expiresIn: '2h' }
            );

            res.json({ token, role: account.role });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

module.exports = new AuthController();
