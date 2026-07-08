const crypto = require('crypto');
const config = require('../config');

function authTelegram(req, res, next) {
    const initData = req.headers.authorization;

    if (!initData) {
        return res.status(401).json({ error: 'Отсутствуют данные авторизации (initData)' });
    }

    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');

        if (!hash) {
            return res.status(401).json({ error: 'Отсутствует хэш для проверки' });
        }

        urlParams.delete('hash');

        const dataCheckString = Array.from(urlParams.keys())
            .sort()
            .map((key) => `${key}=${urlParams.get(key)}`)
            .join('\n');

        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(config.botToken)
            .digest();

        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        if (calculatedHash !== hash) {
            return res.status(403).json({ error: 'Данные скомпрометированы. Неверная подпись.' });
        }

        const userString = urlParams.get('user');
        if (!userString) {
            return res.status(400).json({ error: 'В initData отсутствует объект user' });
        }

        req.telegramUser = JSON.parse(userString);
        next();
    } catch (error) {
        console.error('Ошибка валидации Telegram:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка проверки авторизации' });
    }
}

module.exports = authTelegram;
