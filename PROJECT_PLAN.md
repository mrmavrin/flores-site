# Florist Delivery App - Project Plan

## Назначение проекта

Telegram Mini App для доставки букетов с тремя основными ролями:

- client - клиент, выбирает букет и оформляет заказ;
- florist - флорист, берет заказ в сборку и отмечает готовность;
- courier - курьер, забирает готовый заказ и доставляет клиенту.

Проект разделен на две независимые части:

- frontend - Telegram Mini App;
- backend - Node.js сервер для API, базы данных и Telegram-уведомлений.

## Утвержденная структура проекта

```text
/florist-delivery-app
|
|-- PROJECT_PLAN.md
|-- /database
|   `-- schema.sql
|
|-- /frontend
|   |-- index.html
|   |-- /css
|   |   `-- style.css
|   `-- /js
|       |-- app.js
|       |-- api.js
|       |-- ui.js
|       `-- tg-utils.js
|
`-- /backend
    |-- package.json
    |-- server.js
    |-- config.js
    |
    |-- /middlewares
    |   `-- auth.mdw.js
    |
    |-- /routes
    |   `-- api.routes.js
    |
    |-- /controllers
    |   |-- user.ctrl.js
    |   |-- catalog.ctrl.js
    |   `-- order.ctrl.js
    |
    `-- /services
        |-- db.service.js
        `-- tg.service.js
```

## Frontend: зоны ответственности

### index.html

Точка входа Telegram Mini App.

- подключает `css/style.css`;
- подключает Telegram Web App SDK;
- подключает только один главный скрипт `js/app.js` с `type="module"`;
- содержит контейнер `#app-container`.

### js/tg-utils.js

Отвечает только за получение данных Telegram.

- получает `window.Telegram.WebApp.initData`;
- может получать `initDataUnsafe` только для локальных вспомогательных задач;
- инициализирует Telegram Mini App через `ready()` и `expand()`;
- работает с Telegram CloudStorage с fallback на `localStorage`;
- показывает нативные popup-окна Telegram с fallback на `alert`;
- открывает ссылки через Telegram API с fallback на `window.location.href`;
- не принимает решений по ролям и не ходит на backend.

### js/api.js

Отвечает только за запросы на backend.

- хранит `BASE_URL`;
- использует полный URL backend-сервера, потому что frontend будет жить на GitHub Pages, а backend на отдельном сервере;
- не использует относительные пути вида `/api/catalog`;
- отправляет `Authorization: window.Telegram.WebApp.initData`;
- получает роль пользователя;
- получает каталог;
- создает заказы;
- обновляет статусы через API.

### js/ui.js

Отвечает только за отрисовку DOM.

- рисует витрину клиента;
- рисует панель флориста;
- рисует панель курьера;
- не делает запросы к backend;
- не хранит бизнес-логику.

### js/app.js

Главный frontend-контроллер.

- получает Telegram `initData`;
- запрашивает роль пользователя через `api.js`;
- решает, какой интерфейс показать;
- вызывает функции из `ui.js`.

## Сохранение текущего frontend-визуала

В корне проекта уже есть рабочий `index.html` с готовым клиентским интерфейсом. Его нужно считать источником текущего UX и визуальной логики.

Текущая версия витрины работает на Google Sheets. Это важно сохранить как контекст: существующие листы и поля являются фактической моделью данных, от которой нужно отталкиваться при переносе в MariaDB.

При переносе в новую структуру нельзя переписывать клиентскую часть с нуля. Нужно сохранить:

- общий визуальный стиль витрины Bloom;
- welcome-экран;
- каталог и карточки букетов;
- фильтры и нижнюю навигацию;
- избранное;
- корзину;
- модальные окна карточки букета;
- оформление доставки;
- обработку возврата после оплаты;
- текущие состояния интерфейса и пользовательские сценарии.

Рефакторинг frontend должен быть бережным:

- HTML-каркас переносится в `frontend/index.html`;
- стили выносятся в `frontend/css/style.css`;
- работа с API выносится в `frontend/js/api.js`;
- Telegram-утилиты выносятся в `frontend/js/tg-utils.js`;
- отрисовка и управление существующим интерфейсом постепенно раскладываются между `ui.js` и `app.js`;
- существующие сценарии должны продолжить работать после переноса.

Важное правило: сначала сохраняем текущий клиентский визуал и поведение, потом подключаем новую backend-логику ролей, заказов и каталога.

## Миграция с Google Sheets на MariaDB

Текущая рабочая витрина использует Google Sheets как источник данных. Новая архитектура переводит данные в MariaDB/MySQL, но переход должен быть постепенным.

Стратегия:

- сначала переносим и отлаживаем один магазин;
- не строим полноценную мульти-магазинную систему на первом этапе;
- текущие Google Sheets считаем референсом для структуры каталога, состава букетов, медиа и настроек;
- MariaDB становится целевой базой для backend API;
- после стабилизации багов на одном магазине можно добавить поддержку следующего магазина.

Для MVP фиксируем:

- `store_id = 1` как единственный пилотный магазин;
- все товары, заказы, флористы и курьеры относятся к этому магазину логически;
- отдельную таблицу `stores` можно добавить позже, когда появится второй магазин;
- пока не усложняем SQL-схему мульти-тенантностью.

При будущем расширении на несколько магазинов нужно будет добавить:

- `stores`;
- `store_id` в `products`;
- `store_id` в `orders`;
- `store_id` или связующую таблицу для `florists`;
- `store_id` или связующую таблицу для `couriers`;
- фильтрацию всех API по магазину.

## Backend: зоны ответственности

### config.js

Хранит настройки проекта и использует Fail-Fast.

Критичные переменные окружения:

- `BOT_TOKEN`;
- `DB_HOST`;
- `DB_USER`;
- `DB_PASSWORD`;
- `DB_NAME`.

Если критичная переменная не задана, сервер должен остановиться через `process.exit(1)`.

### middlewares/auth.mdw.js

Проверяет подлинность Telegram Mini App `initData`.

Логика:

1. Получить строку `initData` из заголовка `Authorization`.
2. Распарсить через `URLSearchParams`.
3. Достать `hash`.
4. Удалить `hash` из параметров.
5. Отсортировать ключи по алфавиту.
6. Собрать `dataCheckString` в формате `key=value\nkey=value`.
7. Создать секретный ключ:
   `HMAC-SHA256(BOT_TOKEN, key = "WebAppData")`.
8. Вычислить хэш:
   `HMAC-SHA256(dataCheckString, key = secretKey)`.
9. Сравнить вычисленный хэш с `hash` от Telegram.
10. Если подпись верна, распарсить `user` и положить в `req.telegramUser`.

Контроллеры должны доверять только `req.telegramUser`, а не произвольному `tg_id` из query/body.

### services/db.service.js

Отвечает за подключение к MariaDB/MySQL через `mysql2/promise`.

Основная функция:

```javascript
async function query(sql, params = []) {}
```

В будущем можно добавить транзакции для создания заказа и истории статусов.

### controllers/user.ctrl.js

Определяет роль пользователя и регистрирует новых клиентов.

Каскад проверки:

1. Ищем `tg_id` в `florists`.
2. Если найден активный флорист, возвращаем `{ role: 'florist', isNew: false }`.
3. Ищем `tg_id` в `couriers`.
4. Если найден активный курьер, возвращаем `{ role: 'courier', isNew: false }`.
5. Ищем `tg_id` в `clients`.
6. Если найден клиент, возвращаем `{ role: 'client', isNew: false }`.
7. Если нигде нет, создаем запись в `clients` и возвращаем `{ role: 'client', isNew: true }`.

Новый клиент создается на основе проверенного Telegram-пользователя:

- `tg_id`;
- `first_name`;
- `last_name`;
- `username`.

### controllers/catalog.ctrl.js

Отвечает за витрину букетов.

MVP-логика:

- вернуть список активных товаров из `products`;
- сортировать по `id` или дате создания;
- не показывать товары с `is_active = FALSE`.

### controllers/order.ctrl.js

Отвечает за заказы.

MVP-логика:

- создать заказ;
- получить заказы для клиента;
- получить заказы для флориста;
- получить заказы для курьера;
- сменить статус заказа;
- записать изменение статуса в `order_status_history`.

Защитные правила:

- цену заказа берем из таблицы `products`, а не из frontend;
- проверяем точный переход `old_status -> new_status`;
- назначаем исполнителя при взятии заказа в работу или доставку;
- Telegram-уведомления считаются побочным эффектом и не должны рушить основной запрос.

### services/tg.service.js

Отвечает за Telegram-уведомления.

События:

- заказ создан: уведомить флориста;
- заказ готов: уведомить курьеров;
- заказ взят курьером: уведомить клиента;
- заказ доставлен: уведомить клиента и попросить отзыв.

## Роли

### client

Клиент может:

- смотреть каталог;
- создавать заказ;
- видеть свои заказы;
- получать уведомления о доставке;
- оставлять отзыв позже, если добавим отзывы.

### florist

Флорист может:

- видеть новые заказы;
- взять заказ в работу;
- отметить заказ готовым.

### courier

Курьер может:

- видеть готовые к доставке заказы;
- взять заказ;
- отметить доставку завершенной.

## State Machine заказа

Базовый маршрут:

```text
NEW -> ASSEMBLING -> READY -> DELIVERING -> DELIVERED
```

### NEW

Заказ создан клиентом и считается оплаченным для MVP.

Действие:

- уведомить флориста.

### ASSEMBLING

Флорист нажал "Взять в работу".

### READY

Флорист отметил, что букет собран.

Действие:

- уведомить курьеров.

### DELIVERING

Курьер взял заказ.

Действие:

- уведомить клиента: "Курьер в пути".

### DELIVERED

Курьер отдал букет.

Действие:

- уведомить клиента;
- попросить оставить отзыв.

## Структура базы данных

Используем MariaDB/MySQL на Beget.

Важное правило:

- `tg_id` должен быть `BIGINT`, потому что Telegram ID может превышать лимит 32-битного `INT`.

Таблицы:

- `clients`;
- `florists`;
- `couriers`;
- `products`;
- `orders`;
- `order_status_history`.

### clients

- `id INT AUTO_INCREMENT PRIMARY KEY`;
- `tg_id BIGINT UNIQUE NOT NULL`;
- `first_name VARCHAR(255)`;
- `last_name VARCHAR(255)`;
- `username VARCHAR(255)`;
- `phone VARCHAR(50)`;
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`.

### florists

- `id INT AUTO_INCREMENT PRIMARY KEY`;
- `tg_id BIGINT UNIQUE NOT NULL`;
- `first_name VARCHAR(255)`;
- `last_name VARCHAR(255)`;
- `username VARCHAR(255)`;
- `is_active BOOLEAN DEFAULT TRUE`;
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`.

### couriers

- `id INT AUTO_INCREMENT PRIMARY KEY`;
- `tg_id BIGINT UNIQUE NOT NULL`;
- `first_name VARCHAR(255)`;
- `last_name VARCHAR(255)`;
- `username VARCHAR(255)`;
- `phone VARCHAR(50)`;
- `is_active BOOLEAN DEFAULT TRUE`;
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`.

### products

- `id INT AUTO_INCREMENT PRIMARY KEY`;
- `title VARCHAR(255) NOT NULL`;
- `description TEXT`;
- `price DECIMAL(10, 2) NOT NULL`;
- `image_url VARCHAR(500)`;
- `is_active BOOLEAN DEFAULT TRUE`;
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`.

### orders

- `id INT AUTO_INCREMENT PRIMARY KEY`;
- `client_id INT NOT NULL`;
- `florist_id INT DEFAULT NULL`;
- `courier_id INT DEFAULT NULL`;
- `product_id INT NOT NULL`;
- `status ENUM('NEW', 'ASSEMBLING', 'READY', 'DELIVERING', 'DELIVERED') DEFAULT 'NEW'`;
- `payment_status ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PENDING'`;
- `recipient_name VARCHAR(255)`;
- `recipient_phone VARCHAR(50)`;
- `delivery_address TEXT`;
- `delivery_comment TEXT`;
- `delivery_at DATETIME`;
- `total_price DECIMAL(10, 2) NOT NULL`;
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`.

Связи:

- `client_id` -> `clients.id`;
- `florist_id` -> `florists.id`;
- `courier_id` -> `couriers.id`;
- `product_id` -> `products.id`.

### order_status_history

- `id INT AUTO_INCREMENT PRIMARY KEY`;
- `order_id INT NOT NULL`;
- `old_status ENUM('NEW', 'ASSEMBLING', 'READY', 'DELIVERING', 'DELIVERED')`;
- `new_status ENUM('NEW', 'ASSEMBLING', 'READY', 'DELIVERING', 'DELIVERED') NOT NULL`;
- `changed_by_role ENUM('client', 'florist', 'courier', 'system') NOT NULL`;
- `changed_by_tg_id BIGINT`;
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`.

## Контроль уникальности ролей

Жестко запретить один `tg_id` во всех трех ролевых таблицах средствами SQL сложно и не нужно для MVP.

Это контролирует backend:

1. Сначала ищем пользователя в `florists`.
2. Затем в `couriers`.
3. Затем в `clients`.
4. Если нигде нет, создаем клиента.

Для первой версии считаем, что один Telegram-пользователь имеет одну роль.

## API MVP

Все защищенные маршруты должны использовать `authTelegram`.

```text
GET    /api/users/role
GET    /api/catalog
POST   /api/orders
GET    /api/orders/my
GET    /api/orders/florist
GET    /api/orders/courier
PATCH  /api/orders/:id/status
GET    /health
```

### GET /api/users/role

Возвращает роль текущего Telegram-пользователя.

```json
{
  "role": "client",
  "isNew": true
}
```

### GET /api/catalog

Возвращает активные букеты.

### POST /api/orders

Создает заказ клиента.

Для MVP:

- один заказ = один букет;
- `payment_status = "PAID"`;
- `status = "NEW"`.

### PATCH /api/orders/:id/status

Меняет статус заказа по state machine.

Правила:

- florist может менять `NEW -> ASSEMBLING`;
- florist может менять `ASSEMBLING -> READY`;
- courier может менять `READY -> DELIVERING`;
- courier может менять `DELIVERING -> DELIVERED`.

## Зафиксированные шаблоны backend-файлов

### backend/server.js

Точка входа backend-приложения.

```javascript
const express = require('express');
const cors = require('cors');
const config = require('./config');
const apiRoutes = require('./routes/api.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});
```

### backend/routes/api.routes.js

Центральный маршрутизатор backend API.

```javascript
const express = require('express');
const router = express.Router();

const authTelegram = require('../middlewares/auth.mdw');
const userCtrl = require('../controllers/user.ctrl');
const catalogCtrl = require('../controllers/catalog.ctrl');
const orderCtrl = require('../controllers/order.ctrl');

// Защищенные маршруты
router.get('/users/role', authTelegram, userCtrl.getUserRole);
router.get('/catalog', authTelegram, catalogCtrl.getCatalog);
router.post('/orders', authTelegram, orderCtrl.createOrder);
router.patch('/orders/:id/status', authTelegram, orderCtrl.updateOrderStatus);

module.exports = router;
```

### backend/controllers/catalog.ctrl.js

Контроллер каталога для клиентской витрины.

```javascript
const db = require('../services/db.service');

async function getCatalog(req, res) {
    try {
        const products = await db.query(
            'SELECT id, title, description, price, image_url FROM products WHERE is_active = TRUE ORDER BY id DESC'
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
```

### backend/services/tg.service.js

Сервис отправки Telegram-уведомлений. В MVP бот не слушает команды, а используется только как транспорт для исходящих сообщений.

```javascript
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

async function notifyFloristsNewOrder(orderId, db) {
    const florists = await db.query('SELECT tg_id FROM florists WHERE is_active = TRUE');
    const text = `<b>Новый оплаченный заказ!</b>\nНомер: #${orderId}\nВозьмите в работу в приложении.`;

    for (const florist of florists) {
        await sendMessage(florist.tg_id, text);
    }
}

async function notifyCouriersOrderReady(orderId, db) {
    const couriers = await db.query('SELECT tg_id FROM couriers WHERE is_active = TRUE');
    const text = `<b>Букет собран и готов к доставке!</b>\nЗаказ #${orderId} ждет курьера.`;

    for (const courier of couriers) {
        await sendMessage(courier.tg_id, text);
    }
}

module.exports = {
    sendMessage,
    notifyFloristsNewOrder,
    notifyCouriersOrderReady
};
```

### backend/controllers/order.ctrl.js

Контроллер заказов реализует создание заказа и смену статусов по state machine.

Важные уточнения для реализации:

- `total_price` нельзя доверять из frontend, цену нужно брать из `products`;
- смена статуса должна проверять точный переход, а не только роль;
- при `NEW -> ASSEMBLING` назначаем `florist_id`;
- при `READY -> DELIVERING` назначаем `courier_id`;
- сбой Telegram-уведомления не должен ломать основной бизнес-запрос.

```javascript
const db = require('../services/db.service');
const tgService = require('../services/tg.service');

const transitions = {
    florist: {
        NEW: 'ASSEMBLING',
        ASSEMBLING: 'READY'
    },
    courier: {
        READY: 'DELIVERING',
        DELIVERING: 'DELIVERED'
    }
};

async function createOrder(req, res) {
    try {
        const user = req.telegramUser;
        const { product_id, recipient_name, recipient_phone, delivery_address } = req.body;

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
             (client_id, product_id, total_price, recipient_name, recipient_phone, delivery_address, status, payment_status)
             VALUES (?, ?, ?, ?, ?, ?, 'NEW', 'PAID')`,
            [
                clients[0].id,
                products[0].id,
                products[0].price,
                recipient_name || null,
                recipient_phone || null,
                delivery_address || null
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

async function updateOrderStatus(req, res) {
    try {
        const user = req.telegramUser;
        const orderId = req.params.id;
        const { new_status } = req.body;

        const florists = await db.query('SELECT id FROM florists WHERE tg_id = ? AND is_active = TRUE', [user.id]);
        const couriers = await db.query('SELECT id FROM couriers WHERE tg_id = ? AND is_active = TRUE', [user.id]);

        const role = florists.length ? 'florist' : couriers.length ? 'courier' : 'client';
        if (!transitions[role]) {
            return res.status(403).json({ error: 'Недостаточно прав для смены статуса' });
        }

        const orders = await db.query('SELECT status, client_id FROM orders WHERE id = ?', [orderId]);
        if (!orders.length) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const oldStatus = orders[0].status;
        const expectedStatus = transitions[role][oldStatus];

        if (expectedStatus !== new_status) {
            return res.status(403).json({ error: 'Недопустимый переход статуса' });
        }

        if (new_status === 'ASSEMBLING') {
            await db.query('UPDATE orders SET status = ?, florist_id = ? WHERE id = ?', [
                new_status,
                florists[0].id,
                orderId
            ]);
        } else if (new_status === 'DELIVERING') {
            await db.query('UPDATE orders SET status = ?, courier_id = ? WHERE id = ?', [
                new_status,
                couriers[0].id,
                orderId
            ]);
        } else {
            await db.query('UPDATE orders SET status = ? WHERE id = ?', [new_status, orderId]);
        }

        await db.query(
            `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by_role, changed_by_tg_id)
             VALUES (?, ?, ?, ?, ?)`,
            [orderId, oldStatus, new_status, role, user.id]
        );

        if (new_status === 'READY') {
            await tgService.notifyCouriersOrderReady(orderId, db);
        }

        return res.json({ success: true, status: new_status });
    } catch (error) {
        console.error('Ошибка в updateOrderStatus:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка при обновлении статуса' });
    }
}

module.exports = {
    createOrder,
    updateOrderStatus
};
```

## Порядок реализации

1. Создать структуру проекта.
2. Добавить `PROJECT_PLAN.md`.
3. Добавить `database/schema.sql`.
4. Реализовать backend:
   - `package.json`;
   - `config.js`;
   - `db.service.js`;
   - `auth.mdw.js`;
   - `user.ctrl.js`;
   - `api.routes.js`;
   - `server.js`;
   - `catalog.ctrl.js`;
   - `order.ctrl.js`;
   - `tg.service.js`.
5. Реализовать frontend:
   - `index.html`;
   - `css/style.css`;
   - `js/tg-utils.js`;
   - `js/api.js`;
   - `js/ui.js`;
   - `js/app.js`.
6. Проверить локальный запуск backend.
7. Подготовить деплой на Beget.

## Зависимости backend

Планируемые npm-пакеты:

- `express`;
- `cors`;
- `dotenv`;
- `mysql2`;
- `node-telegram-bot-api`.

## Важные решения

- Backend доверяет только проверенному Telegram `initData`.
- `BOT_TOKEN` обязателен, без него сервер не запускается.
- Новый пользователь автоматически создается как `client`.
- Один заказ содержит один букет.
- Первый этап делаем для одного магазина, условно `store_id = 1`.
- Текущий Google Sheets-интерфейс является референсом для переноса данных в MariaDB.
- Для MVP считаем заказ оплаченным при создании.
- История статусов пишется в отдельную таблицу.
- Фронтенд не хранит секреты и не принимает решений о роли.
