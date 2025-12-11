require('dotenv').config({ path: '.env' });
const axios = require('axios');
const noestService = require('../services/noest.service');

async function tryEndpoint(url) {
    console.log(`Trying GET ${url}...`);
    try {
        const res = await noestService._request('GET', url);
        console.log(`SUCCESS ${url}:`, Array.isArray(res) ? 'Array' : 'Object');
        return true;
    } catch (e) { // Changed 'err' to 'e' to avoid conflict if any, though 'err' is fine too
        console.log(`FAILED ${url}: ${e.message}`);
        return false;
    }
}

async function testDesks() {
    console.log('Testing Desks Endpoints...');

    const candidates = [
        '/get/stop_desks',
        '/get/stop-desks',
        '/get/desks',
        '/get/centers',
        '/stop_desks',
        '/desks' // GET /desks
    ];

    for (const url of candidates) {
        if (await tryEndpoint(url)) break;
    }
}

testDesks();
