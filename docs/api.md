# API

## Базовые правила

Frontend будет размещаться отдельно от backend, например на GitHub Pages. Поэтому `frontend/js/api.js` использует полный URL backend-сервера:

```javascript
const BASE_URL = 'https://tvoy-domen.com/api';
```

Относительные пути вида `/api/catalog` не используем.

Все защищенные маршруты должны использовать Telegram `initData` авторизацию.

## Авторизация Telegram initData

Frontend отправляет полную строку:

```javascript
window.Telegram.WebApp.initData
```

в заголовке:

```text
Authorization: <initData>
```

Backend middleware `auth.mdw.js`:

1. Получает `initData` из `Authorization`.
2. Парсит через `URLSearchParams`.
3. Достает `hash`.
4. Удаляет `hash` из параметров.
5. Сортирует ключи по алфавиту.
6. Собирает `dataCheckString` в формате `key=value\nkey=value`.
7. Создает секретный ключ через `HMAC-SHA256(BOT_TOKEN, key = "WebAppData")`.
8. Вычисляет hash от `dataCheckString`.
9. Сравнивает вычисленный hash с Telegram hash.
10. Если подпись верна, кладет пользователя в `req.telegramUser`.

Контроллеры доверяют только `req.telegramUser`, а не `tg_id` из query/body.

## Routes MVP

```text
GET    /api/users/role
GET    /api/catalog
POST   /api/orders
GET    /api/orders/my
GET    /api/orders/florist
GET    /api/orders/courier
POST   /api/orders/:id/photo
PATCH  /api/orders/:id/status
GET    /health
```

## GET /api/users/role

Определяет роль текущего Telegram-пользователя.

Каскад:

1. Ищем `tg_id` в `florists`.
2. Если найден активный флорист, возвращаем `florist`.
3. Ищем в `couriers`.
4. Если найден активный курьер, возвращаем `courier`.
5. Ищем в `clients`.
6. Если найден клиент, возвращаем `client`.
7. Если нигде нет, создаем клиента и возвращаем `isNew: true`.

Пример:

```json
{
  "role": "client",
  "isNew": true
}
```

## GET /api/catalog

Возвращает активные товары:

```sql
SELECT id, title, description, price, image_url
FROM products
WHERE is_active = TRUE
ORDER BY id DESC
```

## POST /api/orders

Создает заказ.

Для MVP:

- один заказ = один букет;
- `payment_status = "PAID"`;
- `status = "NEW"`;
- `total_price` берем из `products`, не доверяем frontend.

Ожидаемые поля:

- `product_id`
- `recipient_name`
- `recipient_phone`
- `delivery_address`
- `delivery_comment` позже

## POST /api/orders/:id/photo

Флорист загружает фото букета.

- принимает `multipart/form-data`;
- поле файла: `photo`;
- использует `multer`;
- сохраняет файл в `backend/uploads/orders/`;
- пишет URL в `orders.photo_url`;
- переводит заказ в `PHOTO_REVIEW`;
- отправляет клиенту фото через Telegram.

## PATCH /api/orders/:id/status

Меняет статус по state machine.

Разрешенные переходы:

- `NEW -> ASSEMBLING`
- `ASSEMBLING -> PHOTO_REVIEW`
- `REVISION -> PHOTO_REVIEW`
- `PHOTO_REVIEW -> READY`
- `PHOTO_REVIEW -> REVISION`
- `READY -> DELIVERING`
- `DELIVERING -> DELIVERED`

При `REVISION` принимает `note` и сохраняет его в `orders.revision_note`.

## Frontend Transport

`frontend/js/api.js` содержит:

- `getUserRole()`
- `getCatalog()`
- `createOrder(orderData)`
- `getMyOrders()`
- `updateOrderStatus(orderId, newStatus, note)`

Все запросы идут через универсальный `request()`, который добавляет `Authorization: initData`.
