const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');

const authMiddleware = require('../middleware/authMiddleware');

router.get('/commandes', authMiddleware, (req, res) => orderController.getOrders(req, res));
router.post('/commandes', authMiddleware, (req, res) => orderController.createOrder(req, res));
router.get('/references', authMiddleware, (req, res) => orderController.getReferences(req, res));
router.get('/commandes/validation/:column', authMiddleware, (req, res) => orderController.getValidationRules(req, res));
router.delete('/commandes/:id', authMiddleware, (req, res) => orderController.deleteOrder(req, res));
router.put('/commandes/:id', authMiddleware, (req, res) => orderController.updateOrder(req, res));
router.put('/commandes/:id/message-status', authMiddleware, (req, res) => orderController.updateMessageStatus(req, res));
router.put('/commandes/:id/shipped-status', authMiddleware, (req, res) => orderController.updateShippedStatus(req, res));

module.exports = router;
