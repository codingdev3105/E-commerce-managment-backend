const noestService = require('../services/noest.service');
const googleSheetService = require('../services/GoogleSheetService');

class NoestController {

    // 0️⃣ Envoyer une commande depuis le Sheet vers Noest (Integration)
    async sendToNoest(req, res) {
        try {
            const { rowId } = req.body;
            // req.user est peuplé par le middleware d'auth
            const sheetName = req.user.role;

            console.log(`📤 [NoestController] Starting sendToNoest for rowId: ${rowId}, sheet: ${sheetName}`);

            // === STEP 1: Validate input ===
            if (!rowId) {
                return res.status(400).json({ error: 'rowId is required' });
            }

            // === STEP 2: Fetch order from Google Sheet ===
            const rows = await googleSheetService.getAllRows(sheetName);
            if (!rows || rows.length < rowId) {
                console.error(`❌ [NoestController] Order not found.`);
                return res.status(404).json({ error: 'Order not found' });
            }
            const orderRow = rows[rowId - 1];
            const safeGet = (row, index) => row[index] || '';

            // === STEP 3: Extract & Validate ===
            const orderData = {
                reference: safeGet(orderRow, 2),
                client: safeGet(orderRow, 3),
                phone: safeGet(orderRow, 4),
                phone_2: safeGet(orderRow, 5),
                address: safeGet(orderRow, 6),
                commune: safeGet(orderRow, 7),
                amount: safeGet(orderRow, 8),
                wilaya: safeGet(orderRow, 9),
                product: safeGet(orderRow, 10),
                note: safeGet(orderRow, 11),
                poids: safeGet(orderRow, 12),
                isStopDesk: safeGet(orderRow, 15) === 'OUI',
                stationCode: safeGet(orderRow, 17)
            };
            console.log(`✅ [NoestController] Order data:`, orderData);
            if (!orderData.client || !orderData.phone || !orderData.wilaya) {
                return res.status(400).json({ error: 'Missing required fields (client, phone, wilaya)' });
            }
            if (orderData.isStopDesk && !orderData.stationCode) {
                return res.status(400).json({ error: 'StopDesk order requires a station code' });
            }

            // === STEP 4: Build Payload ===
            const noestOrderData = {
                client: orderData.client,
                phone: orderData.phone,
                phone_2: orderData.phone_2,
                adresse: orderData.address,
                wilaya_id: orderData.wilaya,
                commune: orderData.commune,
                montant: orderData.amount,
                remarque: orderData.note,
                produit: orderData.product,
                type_id: 1,
                poids: orderData.poids || '1',
                stop_desk: orderData.isStopDesk ? 1 : 0,
                reference: orderData.reference
            };

            if (orderData.isStopDesk) {
                noestOrderData.station_code = orderData.stationCode;
            }

            // === STEP 5: Call API ===
            // Utilise la méthode createOrder du SERVICE (pas du controller)
            const result = await noestService.createOrder(noestOrderData);

            if (!result.success || !result.tracking) {
                return res.status(500).json({ error: 'Failed to create Noest order', details: result });
            }

            // === STEP 6: Update Sheet ===
            const updatedRow = [...orderRow];
            updatedRow[0] = 'System';
            updatedRow[18] = result.tracking;
            await googleSheetService.updateRow(rowId, updatedRow, sheetName);

            res.json({
                success: true,
                tracking: result.tracking,
                reference: result.reference,
                message: 'Order sent to Noest successfully'
            });

        } catch (error) {
            console.error('❌ [NoestController] Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // 1️⃣ Créer une commande (Direct API Proxy)
    async createOrder(req, res) {
        try {
            const result = await noestService.createOrder(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }



    // 2️⃣ Valider une commande
    async validateOrder(req, res) {
        try {
            const { tracking } = req.body;
            if (!tracking) return res.status(400).json({ success: false, message: "Tracking required" });
            const result = await noestService.validateOrder(tracking);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 3️⃣ Mettre à jour une commande
    async updateOrder(req, res) {
        try {
            const { tracking, ...data } = req.body;
            if (!tracking) return res.status(400).json({ success: false, message: "Tracking required" });
            const result = await noestService.updateOrder(tracking, data);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 4️⃣ Supprimer une commande
    async deleteOrder(req, res) {
        try {
            const { tracking } = req.body;
            if (!tracking) return res.status(400).json({ success: false, message: "Tracking required" });
            const result = await noestService.deleteOrder(tracking);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 5️⃣ Ajouter une remarque
    async addRemark(req, res) {
        try {
            const { tracking, content } = req.body;
            if (!tracking || !content) return res.status(400).json({ success: false, message: "Tracking and content required" });
            const result = await noestService.addRemark(tracking, content);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 6️⃣ Demander une nouvelle tentative
    async askNewTentative(req, res) {
        try {
            const { tracking } = req.body;
            if (!tracking) return res.status(400).json({ success: false, message: "Tracking required" });
            const result = await noestService.askNewTentative(tracking);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 7️⃣ Demander un retour
    async askReturn(req, res) {
        try {
            const { tracking } = req.body;
            if (!tracking) return res.status(400).json({ success: false, message: "Tracking required" });
            const result = await noestService.askReturn(tracking);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 8️⃣ Télécharger l'étiquette (PDF)
    async downloadLabel(req, res) {
        try {
            const { tracking } = req.params;
            if (!tracking) return res.status(400).json({ success: false, message: "Tracking required" });

            const pdfBuffer = await noestService.downloadLabel(tracking);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=label-${tracking}.pdf`);
            res.send(pdfBuffer);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 9️⃣ Informations de suivi (Bulk)
    async getTrackingsInfo(req, res) {
        try {
            const { trackingsArray } = req.body;
            if (!Array.isArray(trackingsArray)) return res.status(400).json({ success: false, message: "trackingsArray must be an array" });
            const result = await noestService.getTrackingsInfo(trackingsArray);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 🔟 Lister les bureaux StopDesk
    async getDesks(req, res) {
        try {
            const result = await noestService.getDesks();
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 1️⃣1️⃣ Obtenir les tarifs
    async getFees(req, res) {
        try {
            const result = await noestService.getFees();
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 1️⃣2️⃣ Lister les communes
    async getCommunes(req, res) {
        try {
            const { wilaya } = req.params; // Optional param
            const result = await noestService.getCommunes(wilaya);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 1️⃣3️⃣ Lister les wilayas
    async getWilayas(req, res) {
        try {
            const result = await noestService.getWilayas();
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new NoestController();
