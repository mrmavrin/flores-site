const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const db = require('../services/db.service');
const tgService = require('../services/tg.service');

const uploadDir = path.join(__dirname, '..', 'uploads', 'orders');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `order-${req.params.id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
            return;
        }
        cb(new Error('Разрешены только изображения.'));
    }
});

async function createOrder(req, res) {
    try {
        const user = req.telegramUser;
        const {
            product_id,
            recipient_name,
            recipient_phone,
            delivery_address,
            delivery_comment
        } = req.body;

        if (!product_id || !recipient_name || !recipient_phone || !delivery_address) {
            return res.status(400).json({ error: 'Заполните товар, имя, телефон и адрес доставки' });
        }

        const clients = await db.query('SELECT id FROM clients WHERE tg_id = ?', [user.id]);
        if (!clients.length) {
            return res.status(403).json({ error: 'Клиент не найден' });
        }

        const products = await db.query(
            'SELECT id, price FROM products WHERE id = ? AND is_active = TRUE',
            [product_id]
        );
        if (!products.length) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        const result = await db.query(
            `INSERT INTO orders
             (client_id, product_id, total_price, recipient_name, recipient_phone, delivery_address, delivery_comment, status, payment_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', 'PAID')`,
            [
                clients[0].id,
                products[0].id,
                products[0].price,
                recipient_name,
                recipient_phone,
                delivery_address,
                delivery_comment || null
            ]
        );

        const orderId = result.insertId;

        await db.query(
            `INSERT INTO order_status_history (order_id, new_status, changed_by_role, changed_by_tg_id)
             VALUES (?, 'NEW', 'client', ?)`,
            [orderId, user.id]
        );

        await tgService.notifyFloristsNewOrder(orderId, db);

        return res.json({ success: true, order_id: orderId });
    } catch (error) {
        console.error('Ошибка в createOrder:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка при создании заказа' });
    }
}

async function getMyOrders(req, res) {
    try {
        const user = req.telegramUser;

        const clients = await db.query('SELECT id FROM clients WHERE tg_id = ?', [user.id]);
        if (!clients.length) {
            return res.json([]);
        }

        const orders = await db.query(
            `SELECT
                o.id,
                o.status,
                o.payment_status,
                o.photo_url,
                o.revision_note,
                o.recipient_name,
                o.recipient_phone,
                o.delivery_address,
                o.delivery_comment,
                o.total_price,
                o.created_at,
                p.title AS product_title,
                p.image_url AS product_image_url
             FROM orders o
             JOIN products p ON p.id = o.product_id
             WHERE o.client_id = ?
             ORDER BY o.created_at DESC`,
            [clients[0].id]
        );

        return res.json(orders);
    } catch (error) {
        console.error('Ошибка в getMyOrders:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка при получении заказов' });
    }
}

async function updateOrderStatus(req, res) {
    try {
        const user = req.telegramUser;
        const orderId = req.params.id;
        const { new_status, note } = req.body;

        const actor = await resolveActor(user.id);
        const orders = await db.query(
            `SELECT o.id, o.status, o.client_id, o.florist_id, c.tg_id AS client_tg_id, f.tg_id AS florist_tg_id
             FROM orders o
             JOIN clients c ON c.id = o.client_id
             LEFT JOIN florists f ON f.id = o.florist_id
             WHERE o.id = ?`,
            [orderId]
        );

        if (!orders.length) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const order = orders[0];
        const oldStatus = order.status;

        if (actor.role === 'client' && actor.id !== order.client_id) {
            return res.status(403).json({ error: 'Нет доступа к этому заказу' });
        }

        if (!isAllowedTransition(actor.role, oldStatus, new_status)) {
            return res.status(403).json({ error: 'Недопустимый переход статуса' });
        }

        await applyStatusUpdate(orderId, new_status, actor, note);

        await db.query(
            `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by_role, changed_by_tg_id)
             VALUES (?, ?, ?, ?, ?)`,
            [orderId, oldStatus, new_status, actor.role, user.id]
        );

        await sendStatusNotifications(order, new_status, note);

        return res.json({ success: true, status: new_status });
    } catch (error) {
        console.error('Ошибка в updateOrderStatus:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка при обновлении статуса' });
    }
}

async function uploadOrderPhoto(req, res) {
    try {
        const user = req.telegramUser;
        const orderId = req.params.id;

        if (!req.file) {
            return res.status(400).json({ error: 'Файл не был загружен' });
        }

        const actor = await resolveActor(user.id);
        if (actor.role !== 'florist') {
            return res.status(403).json({ error: 'Загружать фото может только флорист' });
        }

        const orders = await db.query(
            `SELECT o.id, o.status, o.client_id, c.tg_id AS client_tg_id
             FROM orders o
             JOIN clients c ON c.id = o.client_id
             WHERE o.id = ?`,
            [orderId]
        );
        if (!orders.length) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const order = orders[0];
        if (!isAllowedTransition('florist', order.status, 'PHOTO_REVIEW')) {
            return res.status(403).json({ error: 'Фото можно отправить только из сборки или доработки' });
        }

        const photoUrl = buildPublicUploadUrl(req, req.file.filename);

        await db.query(
            'UPDATE orders SET status = ?, photo_url = ?, revision_note = NULL, florist_id = ? WHERE id = ?',
            ['PHOTO_REVIEW', photoUrl, actor.id, orderId]
        );

        await db.query(
            `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by_role, changed_by_tg_id)
             VALUES (?, ?, 'PHOTO_REVIEW', 'florist', ?)`,
            [orderId, order.status, user.id]
        );

        const caption = `Ваш букет по заказу #${orderId} собран.\n\nОткройте приложение, чтобы согласовать фото.`;
        await tgService.sendPhoto(order.client_tg_id, photoUrl, caption);

        return res.json({ success: true, photo_url: photoUrl, status: 'PHOTO_REVIEW' });
    } catch (error) {
        console.error('Ошибка в uploadOrderPhoto:', error);
        return res.status(500).json({ error: 'Ошибка сервера при сохранении фото' });
    }
}

async function resolveActor(tgId) {
    const florists = await db.query('SELECT id FROM florists WHERE tg_id = ? AND is_active = TRUE', [tgId]);
    if (florists.length) return { role: 'florist', id: florists[0].id };

    const couriers = await db.query('SELECT id FROM couriers WHERE tg_id = ? AND is_active = TRUE', [tgId]);
    if (couriers.length) return { role: 'courier', id: couriers[0].id };

    const clients = await db.query('SELECT id FROM clients WHERE tg_id = ?', [tgId]);
    if (clients.length) return { role: 'client', id: clients[0].id };

    return { role: 'guest', id: null };
}

function isAllowedTransition(role, oldStatus, newStatus) {
    const transitions = {
        florist: {
            NEW: ['ASSEMBLING'],
            ASSEMBLING: ['PHOTO_REVIEW'],
            REVISION: ['PHOTO_REVIEW']
        },
        client: {
            PHOTO_REVIEW: ['READY', 'REVISION']
        },
        courier: {
            READY: ['DELIVERING'],
            DELIVERING: ['DELIVERED']
        }
    };

    return transitions[role]?.[oldStatus]?.includes(newStatus) || false;
}

async function applyStatusUpdate(orderId, newStatus, actor, note) {
    if (newStatus === 'ASSEMBLING') {
        await db.query('UPDATE orders SET status = ?, florist_id = ? WHERE id = ?', [
            newStatus,
            actor.id,
            orderId
        ]);
        return;
    }

    if (newStatus === 'DELIVERING') {
        await db.query('UPDATE orders SET status = ?, courier_id = ? WHERE id = ?', [
            newStatus,
            actor.id,
            orderId
        ]);
        return;
    }

    if (newStatus === 'REVISION') {
        await db.query('UPDATE orders SET status = ?, revision_note = ? WHERE id = ?', [
            newStatus,
            note || null,
            orderId
        ]);
        return;
    }

    await db.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, orderId]);
}

async function sendStatusNotifications(order, newStatus, note) {
    if (newStatus === 'READY') {
        await tgService.notifyCouriersOrderReady(order.id, db);
    } else if (newStatus === 'REVISION' && order.florist_tg_id) {
        await tgService.notifyFloristRevision(order.id, order.florist_tg_id, note);
    } else if (newStatus === 'DELIVERING') {
        await tgService.sendMessage(order.client_tg_id, `Заказ #${order.id} передан курьеру и уже в пути.`);
    } else if (newStatus === 'DELIVERED') {
        await tgService.sendMessage(order.client_tg_id, `Заказ #${order.id} доставлен. Будем рады отзыву!`);
    }
}

function buildPublicUploadUrl(req, filename) {
    const baseUrl = config.publicBaseUrl || `${req.protocol}://${req.get('host')}`;
    return `${baseUrl.replace(/\/$/, '')}/uploads/orders/${filename}`;
}

module.exports = {
    createOrder,
    getMyOrders,
    updateOrderStatus,
    uploadOrderPhoto,
    uploadMiddleware: upload.single('photo')
};
