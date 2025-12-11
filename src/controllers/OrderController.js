const googleSheetService = require('../services/GoogleSheetService');

class OrderController {

    // GET /api/references
    async getReferences(req, res) {
        try {
            const data = await googleSheetService.getReferenceData();
            // Helper to remove header if present
            const clean = (rows) => (rows && rows.length > 1) ? rows.slice(1) : [];

            res.json({
                wilayas: clean(data.wilayas).map(r => ({
                    code: r[0],
                    name: r[1],
                    delivery_price: r[2] || '',      // Prix Domicile
                    delivery_price_desk: r[3] || ''  // Prix Stop Desk
                })),
                communes: clean(data.communes).map(r => ({ name: r[0], wilaya_code: r[1] })),
                stations: clean(data.stations).map(r => ({ name: r[0], code: r[1] }))
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // GET /api/commandes
    async getOrders(req, res) {
        try {
            // Use Role as sheet name
            const sheetName = req.user.role;
            const rows = await googleSheetService.getAllRows(sheetName);
            if (!rows || rows.length === 0) {
                return res.json([]);
            }

            const safeGet = (row, index) => row[index] || '';
            const dataRows = rows.slice(1);

            const formattedOrders = dataRows.map((row, index) => ({
                rowId: index + 2,
                state: safeGet(row, 0),
                date: safeGet(row, 1),
                reference: safeGet(row, 2),
                client: safeGet(row, 3),
                phone: safeGet(row, 4),
                phone2: safeGet(row, 5),
                address: safeGet(row, 6),
                commune: safeGet(row, 7),
                amount: safeGet(row, 8),
                wilaya: safeGet(row, 9),
                // New fields for display
                // 13: PICK UP, 14: ECHANGE, 15: STOP DESK
                isStopDesk: safeGet(row, 15) === 'OUI',
                isExchange: safeGet(row, 14) === 'OUI',
                isPickup: safeGet(row, 13) === 'OUI',
                product: safeGet(row, 10), // Adding Product
                note: safeGet(row, 11),    // Adding Note
                stationCode: safeGet(row, 17), // Station Code for Stop Desk
                tracking: safeGet(row, 18), // Tracking (column S)
            }));
            res.json(formattedOrders);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/commandes
    async createOrder(req, res) {
        try {
            const {
                reference,
                client,
                phone,
                phone2,
                address,
                commune,
                amount,
                wilaya,
                product,
                note,
                isStopDesk,  // Boolean from frontend
                stationCode, // Code if stopdesk
                stationName, // Name if stopdesk
                isExchange   // Boolean from frontend
            } = req.body;

            const state = 'Nouvelle';
            // Format date as DD-MM-YYYY
            const now = new Date();
            const date = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
            const sheetName = req.user.role; // Use Role as sheet name

            // Define final address/commune
            // If Stop Desk: Use Station Name for Address and Commune
            // Else: Use provided Address and Commune
            const finalAddress = isStopDesk ? stationName : address;
            const finalCommune = isStopDesk ? stationName : (commune || '');

            // Logic mapping
            const newRow = [
                state,      // 0: Etat
                date,       // 1: Date
                reference,  // 2: Reference
                client,     // 3: Client
                phone,      // 4: Phone
                phone2 || '', // 5: Phone 2
                finalAddress, // 6: Address (Station Name if Stop Desk)
                finalCommune, // 7: Commune (Station Name if Stop Desk)
                amount,     // 8: Amount
                wilaya,     // 9: Wilaya Code
                product || '', // 10: Product
                note || '',    // 11: Remarque
                '1',        // 12: Poids (Always 1)
                '',         // 13: PICK UP
                isExchange ? 'OUI' : '', // 14: ECHANGE
                isStopDesk ? 'OUI' : '', // 15: STOP DESK
                '',         // 16: Ouvrir
                isStopDesk ? stationCode : '', // 17: Code Station
                ''          // 18: Tracking
            ];
            await googleSheetService.addRow(newRow, sheetName);

            res.status(201).json({
                message: 'Commande ajoutée',
                data: { reference, rowId: 'posted' }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/commandes/:id
    async deleteOrder(req, res) {
        try {
            const rowIndex = req.params.id; // rowId from frontend (1-based index)
            const sheetName = req.user.role;

            await googleSheetService.deleteRow(parseInt(rowIndex), sheetName);

            res.json({ message: 'Commande supprimée' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    // PUT /api/commandes/:id
    async updateOrder(req, res) {
        try {
            const rowIndex = req.params.id;
            const sheetName = req.user.role;

            // 1. Fetch current row to preserve data (tracking) and check transitions
            const rows = await googleSheetService.getAllRows(sheetName);

            if (!rows || rows.length < rowIndex) {
                return res.status(404).json({ error: 'Order not found' });
            }
            const currentRow = rows[rowIndex - 1]; // 0-based
            const safeGet = (row, index) => row[index] || '';

            const oldState = safeGet(currentRow, 0);
            const oldTracking = safeGet(currentRow, 18);

            const {
                reference,
                client,
                phone,
                phone2,
                address,
                commune,
                amount,
                wilaya,
                product,
                note,
                isStopDesk,
                stationCode,
                stationName,
                isExchange,
                state // Can update state too
            } = req.body;

            const date = req.body.date || safeGet(currentRow, 1); // Preserve date
            const newState = state || oldState;

            // Logic for Tracking: Preserve unless System -> Other
            let newTracking = oldTracking;

            const isSystem = (s) => s && (s.toLowerCase().includes('system') || s.toLowerCase().includes('envoyer'));

            // If changing FROM System TO something else (e.g. Annuler), clear tracking
            if (isSystem(oldState) && newState !== oldState) {
                newTracking = '';
            }

            const finalAddress = isStopDesk ? stationName : address;
            const finalCommune = isStopDesk ? stationName : (commune || '');

            const updatedRow = [
                newState,   // 0: Etat
                date,       // 1: Date
                reference,  // 2: Reference
                client,     // 3: Client
                phone,      // 4: Phone
                phone2 || '', // 5: Phone 2
                finalAddress, // 6: Address
                finalCommune, // 7: Commune
                amount,     // 8: Amount
                wilaya,     // 9: Wilaya Code
                product || '', // 10: Product
                note || '',    // 11: Remarque
                '1',        // 12: Poids
                '',         // 13: PICK UP
                isExchange ? 'OUI' : '', // 14: ECHANGE
                isStopDesk ? 'OUI' : '', // 15: STOP DESK
                '',         // 16: Ouvrir
                isStopDesk ? stationCode : '', // 17: Code Station
                newTracking // 18: Tracking (Preserved or Cleared)
            ];

            await googleSheetService.updateRow(parseInt(rowIndex), updatedRow, sheetName);

            res.json({ message: 'Commande modifiée' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    // GET /api/commandes/validation/:column
    async getValidationRules(req, res) {
        try {
            const sheetName = req.user.role;
            const column = req.params.column; // e.g., "A"

            const validationRules = await googleSheetService.getColumnValidation(sheetName, column);

            res.json({
                sheet: sheetName,
                column: column,
                validationRules: validationRules
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

}

module.exports = new OrderController();
