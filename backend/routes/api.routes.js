const express = require('express');
const router = express.Router();

const authTelegram = require('../middlewares/auth.mdw');
const userCtrl = require('../controllers/user.ctrl');
const catalogCtrl = require('../controllers/catalog.ctrl');
const orderCtrl = require('../controllers/order.ctrl');

router.get('/users/role', authTelegram, userCtrl.getUserRole);
router.get('/catalog', authTelegram, catalogCtrl.getCatalog);

router.post('/orders', authTelegram, orderCtrl.createOrder);
router.get('/orders/my', authTelegram, orderCtrl.getMyOrders);
router.patch('/orders/:id/status', authTelegram, orderCtrl.updateOrderStatus);
router.post(
    '/orders/:id/photo',
    authTelegram,
    orderCtrl.uploadMiddleware,
    orderCtrl.uploadOrderPhoto
);

module.exports = router;
