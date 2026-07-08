const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');

const bot = new TelegramBot(config.botToken, { polling: false });

async function sendMessage(tgId, text, options = {}) {
    if (!tgId) return;

    try {
        await bot.sendMessage(tgId, text, { parse_mode: 'HTML', ...options });
    } catch (error) {
        console.error(`Ошибка отправки TG-сообщения пользователю ${tgId}:`, error.message);
    }
}

async function sendPhoto(tgId, photoUrl, caption = '', options = {}) {
    if (!tgId || !photoUrl) return;

    try {
        await bot.sendPhoto(tgId, photoUrl, {
            caption,
            parse_mode: 'HTML',
            ...options
        });
    } catch (error) {
        console.error(`Ошибка отправки TG-фото пользователю ${tgId}:`, error.message);
        await sendMessage(tgId, `${caption}\n\nФото: ${photoUrl}`.trim());
    }
}

async function notifyFloristsNewOrder(orderId, db) {
    const florists = await db.query('SELECT tg_id FROM florists WHERE is_active = TRUE');
    const text = `<b>Новый оплаченный заказ!</b>\nНомер: #${orderId}\nВозьмите в работу в приложении.`;

    for (const florist of florists) {
        await sendMessage(florist.tg_id, text);
    }
}

async function notifyCouriersOrderReady(orderId, db) {
    const couriers = await db.query('SELECT tg_id FROM couriers WHERE is_active = TRUE');
    const text = `<b>Букет согласован и готов к доставке!</b>\nЗаказ #${orderId} ждет курьера.`;

    for (const courier of couriers) {
        await sendMessage(courier.tg_id, text);
    }
}

async function notifyFloristRevision(orderId, floristTgId, note) {
    const text = `<b>Клиент просит доработать заказ #${orderId}</b>\n\n${note || 'Комментарий не указан.'}`;
    await sendMessage(floristTgId, text);
}

module.exports = {
    sendMessage,
    sendPhoto,
    notifyFloristsNewOrder,
    notifyCouriersOrderReady,
    notifyFloristRevision
};
