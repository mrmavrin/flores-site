const db = require('../services/db.service');

async function getCatalog(req, res) {
    try {
        const products = await db.query(
            'SELECT id, title, description, price, image_url, is_active FROM products WHERE is_active = TRUE ORDER BY id DESC'
        );
        return res.json(products);
    } catch (error) {
        console.error('Ошибка в getCatalog:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера при получении каталога' });
    }
}

module.exports = {
    getCatalog
};
