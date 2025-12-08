const express = require('express');
const router = express.Router();
const noestController = require('../controllers/noest.controller');
const authMiddleware = require('../middleware/authMiddleware'); // Required for user role

// Routes definitions based on user requirements

// POST /noest/send-from-sheet -> Send Order from Google Sheet to Noest
router.post('/send-from-sheet', authMiddleware, noestController.sendToNoest);

// POST /noest/order -> Create Order (Direct)
router.post('/order', noestController.createOrder);

// POST /noest/order/validate -> Validate Order
router.post('/order/validate', noestController.validateOrder);

// POST /noest/order/update -> Update Order
router.post('/order/update', noestController.updateOrder);

// POST /noest/order/delete -> Delete Order
router.post('/order/delete', noestController.deleteOrder);

// POST /noest/order/remark -> Add Remark
router.post('/order/remark', noestController.addRemark);

// POST /noest/order/tentative -> Ask New Tentative
router.post('/order/tentative', noestController.askNewTentative);

// POST /noest/order/return -> Ask Return
router.post('/order/return', noestController.askReturn);

// GET /noest/order/label/:tracking -> Download Label
router.get('/order/label/:tracking', noestController.downloadLabel);

// POST /noest/trackings -> Get Trackings Info
router.post('/trackings', noestController.getTrackingsInfo);

// GET /noest/desks -> Get Desks
router.get('/desks', noestController.getDesks);

// GET /noest/fees -> Get Fees
router.get('/fees', noestController.getFees);

// GET /noest/communes -> Get All Communes
router.get('/communes', noestController.getCommunes);

// GET /noest/communes/:wilaya -> Get Communes by Wilaya
router.get('/communes/:wilaya', noestController.getCommunes);

// GET /noest/wilayas -> Get Wilayas
router.get('/wilayas', noestController.getWilayas);

module.exports = router;
