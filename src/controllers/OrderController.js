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
                reference: safeGet(row, 2),
                    client: safeGet(row, 3),
                        phone: safeGet(row, 4),
                            phone2: safeGet(row, 5),
                                address: safeGet(row, 6),
                                    commune: safeGet(row, 7),
                                        amount: safeGet(row, 8),
                                            wilaya: safeGet(row, 9),
                                                product: safeGet(row, 10),
                                                    note: safeGet(row, 11),
                                                        isPickup: safeGet(row, 13) === 'OUI',
                                                            isExchange: safeGet(row, 14) === 'OUI',
                                                                isStopDesk: safeGet(row, 15) === 'OUI',
                                                                    stationCode: safeGet(row, 17),
                                                                        tracking: safeGet(row, 18),
                                                                            isMessageSent: (() => {
                                                                                // Default to 19, or use detected index if valid
                                                                                const idx = (typeof messageSentIndex !== 'undefined' && messageSentIndex !== -1) ? messageSentIndex : 19;
                                                                                const rawVal = safeGet(row, idx);
                                                                                const cleanVal = String(rawVal).trim().toUpperCase();
                                                                                // Debug log for tracking rows
                                                                                if (safeGet(row, 18)) {
                                                                                    console.log(`Row ${index + 2} [${safeGet(row, 18)}]: MsgSent(idx=${idx})='${rawVal}' -> isOUI=${cleanVal === 'OUI'}`);
                                                                                }
                                                                                return cleanVal === 'OUI';
                                                                            })()
            }));

            res.json(formattedOrders);
        } catch (error) {
            console.error(error);
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
                isStopDesk,
                stationCode,
                stationName,
                isExchange
            } = req.body;

            const state = 'Nouvelle';
            const now = new Date();
            const date = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
            const sheetName = req.user.role;

            const finalAddress = isStopDesk ? stationName : address;
            const finalCommune = isStopDesk ? stationName : (commune || '');

            const formatPhone = (phoneNum) => {
                if (!phoneNum) return '';
                const cleaned = phoneNum.toString().trim();
                return cleaned.startsWith('0') ? cleaned : `0${cleaned}`;
            };

            const newRow = [
                state,
                date,
                reference,
                client,
                formatPhone(phone),
                formatPhone(phone2),
                finalAddress,
                finalCommune,
                amount,
                wilaya,
                product || '',
                note || '',
                '1',
                '',
                isExchange ? 'OUI' : '',
                isStopDesk ? 'OUI' : '',
                '',
                isStopDesk ? stationCode : '',
                '',
                ''
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
            const oldMessageStatus = safeGet(currentRow, 19); // Preserve Message Status

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

            // Format phone numbers to ensure leading zero (RAW mode will preserve it)
            const formatPhone = (phoneNum) => {
                if (!phoneNum) return '';
                const cleaned = phoneNum.toString().trim();
                // If it doesn't start with 0, add it
                return cleaned.startsWith('0') ? cleaned : `0${cleaned}`;
            };

            const updatedRow = [
                newState,   // 0: Etat
                date,       // 1: Date
                reference,  // 2: Reference
                client,     // 3: Client
                formatPhone(phone),      // 4: Phone
                formatPhone(phone2), // 5: Phone 2
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
                newTracking, // 18: Tracking (Preserved or Cleared)
                oldMessageStatus // 19: Message Status (Preserved)
            ];

            await googleSheetService.updateRow(parseInt(rowIndex), updatedRow, sheetName);

            res.json({ message: 'Commande modifiée' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/commandes/:id/message-status
    async updateMessageStatus(req, res) {
        try {
            const rowIndex = req.params.id;
            if (!rowIndex || isNaN(parseInt(rowIndex))) {
                throw new Error("Invalid Order ID provided");
            }

            const sheetName = req.user.role;
            const status = req.body.status || 'OUI';

            // 1. Fetch headers to find correct column
            // We fetch all rows for simplicity and robustness, though headers-only fetch would be optimal
            const rows = await googleSheetService.getAllRows(sheetName);
            if (!rows || rows.length === 0) {
                throw new Error("Empty sheet");
            }

            const headerRow = rows[0];
            let messageSentIndex = 19; // Default T
            if (headerRow) {
                const foundIndex = headerRow.findIndex(h =>
                    h && (h.toString().toLowerCase().includes('message') || h.toString().toLowerCase().includes('envoyé'))
                );
                if (foundIndex !== -1) {
                    messageSentIndex = foundIndex;
                    console.log(`[UpdateMsg] Detected 'Message Sent' column index: ${messageSentIndex}`);
                } else {
                    console.warn("[UpdateMsg] Could not auto-detect 'Message Sent' column. Defaulting to 19.");
                }
            }

            await googleSheetService.updateCell(parseInt(rowIndex), messageSentIndex, status, sheetName);
            res.json({ message: 'Statut message mis à jour', status: status, column: messageSentIndex });
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
