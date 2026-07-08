# Frontend

## Общий принцип

Старый корневой `index.html` остается референсом визуала и логики Google Sheets-витрины.

Новый frontend лежит в `frontend/`:

- `index.html` - HTML-разметка без inline-скриптов;
- `css/style.css` - вынесенные стили;
- `js/tg-utils.js` - адаптер Telegram WebApp;
- `js/api.js` - транспорт к backend;
- `js/ui.js` - только отрисовка DOM;
- `js/app.js` - состояние и управление сценариями.

## Сохранение визуала

Нужно сохранить:

- Bloom-визуал;
- welcome-экран;
- каталог и карточки;
- фильтры и нижнюю навигацию;
- избранное;
- корзину;
- шторку букета;
- checkout и доставку;
- обработку оплаты/возврата позже.

## tg-utils.js

Единый адаптер Telegram:

- `initTelegramApp()`
- `getInitData()`
- `getTelegramUser()`
- `closeTelegramApp()`
- `cloudSet()`
- `cloudGet()`
- `showPopup()`
- `openLink()`

## api.js

Только запросы к backend.

- хранит `BASE_URL`;
- использует полный backend URL;
- добавляет `Authorization: initData`;
- не рисует UI;
- не принимает решений по ролям.

Сейчас включен mock-режим:

```javascript
const USE_MOCK = true;
```

Он позволяет тестировать клиентский путь без Beget, MariaDB и BotFather:

- `getCatalog()` возвращает тестовые букеты;
- `createOrder()` создает заказ в памяти;
- `getMyOrders()` возвращает активный mock-заказ;
- `updateOrderStatus()` меняет статус mock-заказа;
- `window.mockAPI` имитирует действия флориста и курьера.

Команды для консоли браузера:

```javascript
window.mockAPI.simulateAssembling()
window.mockAPI.simulatePhotoReview()
window.mockAPI.simulateDelivering()
window.mockAPI.simulateDelivered()
window.mockAPI.clearOrder()
window.mockAPI.getState()
```

Для подключения реального backend нужно переключить:

```javascript
const USE_MOCK = false;
```

## ui.js

Только DOM-отрисовка.

Уже отвечает за:

- `renderCatalog()`;
- карточки товаров;
- `openBouquetModalUI()`;
- `closeBouquetModalUI()`;
- `updateModalQtyUI()`;
- `renderSlidesUI()`;
- `updateSlidePositionUI()`;
- `updateCountersUI()`;
- `renderCart()`.

Правила:

- не ходит в API;
- не хранит бизнес-состояние;
- получает подготовленные поля: `mediaHtml`, `badgeHtml`, `priceFormatted`;
- использует `data-*` для делегирования событий.

## app.js

Главный frontend-контроллер.

Хранит:

- `currentView`;
- `catalog`;
- `favorites`;
- `cart`;
- состояние шторки: `currentBouquetId`, `currentQty`, `currentSlides`, `currentSlideIndex`.

Делает:

- инициализацию Telegram;
- загрузку каталога;
- маппинг данных для `ui.js`;
- переключение `home / fav / cart / delivery`;
- делегирование кликов;
- управление корзиной;
- подготовку checkout.

## Корзина

Корзина хранится в `state.cart` как `Map`.

Формат:

```javascript
Map<productId, quantity>
```

`app.js`:

- добавляет товар из шторки;
- меняет количество;
- удаляет товар;
- считает итог;
- формирует строки для `ui.js`.

`ui.js`:

- рисует пустое состояние;
- рисует `cart-line`;
- рисует итог;
- обновляет счетчик.

## Checkout MVP

Выбранный подход: все данные заказа отправляем одним запросом.

Сценарий:

1. Клиент нажимает "Оплатить" в корзине.
2. Открывается checkout-модалка.
3. Поля: имя, телефон, адрес доставки, комментарий опционально.
4. Frontend вызывает `createOrder()`.
5. Backend создает заказ `NEW` и `PAID`.
6. Корзина очищается.
7. Клиент видит экран успеха/доставки.

Старый отдельный флоу доставки с картой вернем позже.

Текущая реализация:

- `frontend/index.html` содержит checkout-модалку с полями `name`, `phone`, `address`, `comment`;
- поле email удалено, потому что API его не использует;
- `ui.js` управляет открытием, закрытием, ошибками и loading-состоянием checkout;
- `app.js` валидирует имя, телефон и адрес;
- `app.js` вызывает `createOrder()` из `api.js`;
- после успеха корзина очищается, модалка закрывается, пользователь переходит на вкладку `delivery`;
- вкладка `delivery` пока показывает базовый статус созданного заказа.

## Фото-согласование

Клиентский экран доставки должен уметь показывать заказ в статусе `PHOTO_REVIEW`:

- фото букета;
- textarea для правок;
- кнопка "Принимаю";
- кнопка "Исправить".

Текущая реализация клиентского трекера:

- `api.js` содержит `getMyOrders()`;
- `api.js` отправляет `note` в `updateOrderStatus(orderId, newStatus, note)`;
- mock-режим позволяет перевести заказ в `PHOTO_REVIEW` через `window.mockAPI.simulatePhotoReview()`;
- `ui.js` содержит `renderDeliveryTrackerUI(order, container)`;
- `app.js` хранит `state.activeOrder`;
- при переходе на вкладку `delivery` вызывается `loadActiveOrder()`;
- `PHOTO_REVIEW -> READY` обрабатывает `approveBouquet()`;
- `PHOTO_REVIEW -> REVISION` обрабатывает `rejectBouquet()`.

Флористский интерфейс позже получит:

```html
<input type="file" accept="image/*" capture="environment">
```

и кнопку отправки фото на согласование.
