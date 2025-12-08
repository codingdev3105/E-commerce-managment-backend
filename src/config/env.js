require('dotenv').config();
const path = require('path');

module.exports = {
    PORT: process.env.PORT || 3001,
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
    CREDENTIALS: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
    }
};
