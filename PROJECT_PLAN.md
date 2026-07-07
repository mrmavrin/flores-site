# Florist Delivery App - Project Plan

Главный файл-диспетчер. Его задача - быстро объяснить архитектуру проекта и направить к детальным документам в `docs/`.

## Назначение проекта

Telegram Mini App для доставки букетов.

Проект переводит текущую рабочую витрину на Google Sheets в новую архитектуру:

- `frontend` - Telegram Mini App, размещение возможно на GitHub Pages;
- `backend` - Node.js API на Beget;
- `database` - MariaDB/MySQL схема;
- `docs` - подробная архитектурная документация.

На первом этапе MVP работает для одного магазина. Мульти-магазинность не добавляем, пока не отладим основные баги.

## Роли

- `client` - клиент: смотрит каталог, добавляет товары в корзину, оформляет заказ, согласует фото букета.
- `florist` - флорист: берет заказ в работу, загружает фото букета, отправляет на согласование.
- `courier` - курьер: берет готовый заказ и завершает доставку.

## Структура проекта

```text
/florist-delivery-app
|
|-- PROJECT_PLAN.md
|-- /docs
|   |-- database.md
|   |-- api.md
|   |-- frontend.md
|   `-- backend.md
|
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
    |-- /uploads
    |   `-- /orders
    |-- /middlewares
    |   `-- auth.mdw.js
    |-- /routes
    |   `-- api.routes.js
    |-- /controllers
    |   |-- user.ctrl.js
    |   |-- catalog.ctrl.js
    |   `-- order.ctrl.js
    `-- /services
        |-- db.service.js
        `-- tg.service.js
```

## Документация

- [database.md](docs/database.md) - таблицы, статусы заказов, фото-согласование, миграция с Google Sheets.
- [api.md](docs/api.md) - маршруты, Telegram `initData` авторизация, frontend transport.
- [frontend.md](docs/frontend.md) - модули frontend, витрина, корзина, шторки, checkout-подход.
- [backend.md](docs/backend.md) - backend-модули, сервисы, шаблоны кода, зависимости.

## Текущий принцип работы

1. Сначала сохраняем визуал и сценарии старого `index.html`.
2. Затем постепенно выносим стили, UI, контроллеры и API в модули.
3. Backend доверяет только проверенному Telegram `initData`.
4. Заказы и роли определяются на сервере.
5. Фото букета храним локально на Beget, Telegram используем для уведомлений.

## Следующий фокус

После разделения документации следующий технический шаг:

- frontend checkout: имя, телефон, адрес в одном модальном окне;
- вызов `createOrder()` из `api.js`;
- очистка корзины после успешного ответа;
- переход к экрану статуса/доставки.
