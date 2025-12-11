require('dotenv').config({ path: '.env' });
const noestService = require('../services/noest.service');

async function testDesks() {
    console.log('Testing Noest Desks...');
    try {
        const desks = await noestService.getDesks();
        console.log('Desks success:', Array.isArray(desks) ? 'Yes, Array' : 'Yes, Object');
        console.log('Count:', desks.length);
        if (desks.length > 0) console.log('First desk:', desks[0]);
    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

testDesks();
