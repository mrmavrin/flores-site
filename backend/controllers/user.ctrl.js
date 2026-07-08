const db = require('../services/db.service');

async function getUserRole(req, res) {
    try {
        const user = req.telegramUser;

        const florists = await db.query(
            'SELECT id FROM florists WHERE tg_id = ? AND is_active = TRUE',
            [user.id]
        );
        if (florists.length) {
            return res.json({ role: 'florist', isNew: false });
        }

        const couriers = await db.query(
            'SELECT id FROM couriers WHERE tg_id = ? AND is_active = TRUE',
            [user.id]
        );
        if (couriers.length) {
            return res.json({ role: 'courier', isNew: false });
        }

        const clients = await db.query('SELECT id FROM clients WHERE tg_id = ?', [user.id]);
        if (clients.length) {
            return res.json({ role: 'client', isNew: false });
        }

        await db.query(
            'INSERT INTO clients (tg_id, first_name, last_name, username) VALUES (?, ?, ?, ?)',
            [user.id, user.first_name || null, user.last_name || null, user.username || null]
        );

        return res.json({ role: 'client', isNew: true });
    } catch (error) {
        console.error('Ошибка в getUserRole:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера при определении роли' });
    }
}

module.exports = {
    getUserRole
};
