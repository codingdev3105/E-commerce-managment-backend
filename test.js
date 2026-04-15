require('dotenv').config();
const noestService = require('./src/services/noest.service');
const fs = require('fs');

async function testDownload() {
    // Remplacer par un vrai numéro de tracking Noest
    const tracking = 'N5J-35D-16293743'; 
    
    console.log(`🚀 [TEST] Téléchargement du bordereau pour le tracking: ${tracking}`);
    
    try {
        const pdfBuffer = await noestService.downloadLabel(tracking);
        
        const fileName = `bordereau-${tracking}.pdf`;
        fs.writeFileSync(fileName, pdfBuffer);
        
        console.log(`✅ Succès ! Le fichier a été enregistré sous : ${fileName}`);
    } catch (error) {
        console.error('❌ Erreur :', error.message);
    }
}

testDownload();
