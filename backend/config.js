require('dotenv').config();

const requiredEnv = ['BOT_TOKEN', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

requiredEnv.forEach((envVar) => {
    if (!process.env[envVar]) {
        console.error(`КРИТИЧЕСКАЯ ОШИБКА: Переменная окружения ${envVar} не задана.`);
        process.exit(1);
    }
});

module.exports = {
    port: process.env.PORT || 3000,
    botToken: process.env.BOT_TOKEN,
    publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
    db: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    }
};
