# Backend

## Общий принцип

Backend - Node.js сервер на Beget.

Основные зависимости:

- `express`;
- `cors`;
- `dotenv`;
- `mysql2`;
- `multer` 2.x;
- `node-telegram-bot-api`.

## config.js

Использует Fail-Fast.

Критичные переменные:

- `BOT_TOKEN`;
- `DB_HOST`;
- `DB_USER`;
- `DB_PASSWORD`;
- `DB_NAME`.

Если переменной нет, сервер останавливается через `process.exit(1)`.

## server.js

Точка входа backend.

```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});
```

## db.service.js

Создает пул MariaDB/MySQL через `mysql2/promise`.

Основная функция:

```javascript
async function query(sql, params = []) {}
```

Позже нужны транзакции для создания заказа, истории статусов и фото-согласования.

## tg.service.js

Telegram-бот используется как транспорт уведомлений.

- `polling: false`;
- команды не слушает;
- отправляет сообщения и фото.

Функции:

- `sendMessage(tgId, text, options)`
- `notifyFloristsNewOrder(orderId, db)`
- `notifyCouriersOrderReady(orderId, db)`
- позже `sendPhoto(tgId, photoUrl, caption, options)`

## auth.mdw.js

Проверяет Telegram `initData` через HMAC-SHA256.

Если проверка успешна:

```javascript
req.telegramUser = parsedUser;
```

## user.ctrl.js

Определяет роль.

Каскад:

1. `florists`
2. `couriers`
3. `clients`
4. если не найден - создать `client`

## catalog.ctrl.js

Возвращает активные букеты из `products`.

## order.ctrl.js

Отвечает за:

- создание заказа;
- получение заказов для ролей;
- смену статусов;
- историю статусов;
- загрузку фото;
- запись `photo_url`;
- запись `revision_note`;
- уведомления через `tg.service.js`.

Защитные правила:

- цену берем из `products`;
- проверяем точный переход state machine;
- при `NEW -> ASSEMBLING` назначаем `florist_id`;
- при `READY -> DELIVERING` назначаем `courier_id`;
- Telegram-уведомления не должны ломать основной запрос.

## api.routes.js

```javascript
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
router.post('/orders/:id/photo', authTelegram, orderCtrl.uploadMiddleware, orderCtrl.uploadOrderPhoto);
router.patch('/orders/:id/status', authTelegram, orderCtrl.updateOrderStatus);

module.exports = router;
```

## Uploads

Локальное хранение:

```text
backend/uploads/orders/
```

Правила:

- `uploads/` не коммитим;
- только изображения;
- размер до 5 MB;
- имя файла генерирует сервер;
- Express раздает `/uploads`.

## Local Env

Для локального запуска нужен `backend/.env`:

```text
BOT_TOKEN=
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
PORT=3000
PUBLIC_BASE_URL=
```

`PUBLIC_BASE_URL` нужен для стабильных публичных ссылок на фото после деплоя. Локально можно оставить пустым.
