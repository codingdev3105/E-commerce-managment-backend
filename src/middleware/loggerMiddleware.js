const loggerMiddleware = (req, res, next) => {
    console.log(`[${new Date().toISOString()}] --- NOUVELLE REQUÊTE ---`);
    console.log(`Méthode: ${req.method} | URL: ${req.url}`);
    
    // Log request body for POST/PUT/PATCH methods, if there is one
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && Object.keys(req.body || {}).length > 0) {
        console.log(`Body de la requête:`, req.body);
    }

    // Intercept the response to log after it finishes processing
    const originalSend = res.send;
    res.send = function (body) {
        console.log(`[${new Date().toISOString()}] --- RÉPONSE ---`);
        
        if (req.method === 'GET' && res.statusCode >= 200 && res.statusCode < 300) {
            // For GET requests (data retrieval), log a success message instead of the data
            console.log(`Statut: ${res.statusCode} | Message: Données bien récupérées pour ${req.url}`);
        } else {
            // For other requests or errors
            console.log(`Statut: ${res.statusCode} pour ${req.method} ${req.url}`);
            // Optional: if it's an error, you might want to see the error body
            if (res.statusCode >= 400) {
                console.log(`Erreur:`, body);
            }
        }
        console.log(`-----------------------------------`);
        
        // Call the original send method to actually send the response
        return originalSend.apply(this, arguments);
    };

    next();
};

module.exports = loggerMiddleware;
