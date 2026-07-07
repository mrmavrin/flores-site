# Database

## MariaDB/MySQL

Используем MariaDB/MySQL на Beget.

Важное правило:

- `tg_id` всегда `BIGINT`, потому что Telegram ID может превышать 32-битный `INT`.

## Таблицы

### clients

- `id INT AUTO_INCREMENT PRIMARY KEY`
- `tg_id BIGINT UNIQUE NOT NULL`
- `first_name VARCHAR(255)`
- `last_name VARCHAR(255)`
- `username VARCHAR(255)`
- `phone VARCHAR(50)`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

### florists

- `id INT AUTO_INCREMENT PRIMARY KEY`
- `tg_id BIGINT UNIQUE NOT NULL`
- `first_name VARCHAR(255)`
- `last_name VARCHAR(255)`
- `username VARCHAR(255)`
- `is_active BOOLEAN DEFAULT TRUE`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

### couriers

- `id INT AUTO_INCREMENT PRIMARY KEY`
- `tg_id BIGINT UNIQUE NOT NULL`
- `first_name VARCHAR(255)`
- `last_name VARCHAR(255)`
- `username VARCHAR(255)`
- `phone VARCHAR(50)`
- `is_active BOOLEAN DEFAULT TRUE`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

### products

- `id INT AUTO_INCREMENT PRIMARY KEY`
- `title VARCHAR(255) NOT NULL`
- `description TEXT`
- `price DECIMAL(10, 2) NOT NULL`
- `image_url VARCHAR(500)`
- `is_active BOOLEAN DEFAULT TRUE`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

### orders

- `id INT AUTO_INCREMENT PRIMARY KEY`
- `client_id INT NOT NULL`
- `florist_id INT DEFAULT NULL`
- `courier_id INT DEFAULT NULL`
- `product_id INT NOT NULL`
- `status ENUM('NEW', 'ASSEMBLING', 'PHOTO_REVIEW', 'REVISION', 'READY', 'DELIVERING', 'DELIVERED') DEFAULT 'NEW'`
- `payment_status ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PENDING'`
- `photo_url VARCHAR(500) DEFAULT NULL`
- `revision_note TEXT DEFAULT NULL`
- `recipient_name VARCHAR(255)`
- `recipient_phone VARCHAR(50)`
- `delivery_address TEXT`
- `delivery_comment TEXT`
- `delivery_at DATETIME`
- `total_price DECIMAL(10, 2) NOT NULL`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

Связи:

- `client_id` -> `clients.id`
- `florist_id` -> `florists.id`
- `courier_id` -> `couriers.id`
- `product_id` -> `products.id`

### order_status_history

- `id INT AUTO_INCREMENT PRIMARY KEY`
- `order_id INT NOT NULL`
- `old_status ENUM('NEW', 'ASSEMBLING', 'PHOTO_REVIEW', 'REVISION', 'READY', 'DELIVERING', 'DELIVERED')`
- `new_status ENUM('NEW', 'ASSEMBLING', 'PHOTO_REVIEW', 'REVISION', 'READY', 'DELIVERING', 'DELIVERED') NOT NULL`
- `changed_by_role ENUM('client', 'florist', 'courier', 'system') NOT NULL`
- `changed_by_tg_id BIGINT`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

## State Machine

Полная цепочка:

```text
NEW -> ASSEMBLING -> PHOTO_REVIEW -> REVISION -> PHOTO_REVIEW -> READY -> DELIVERING -> DELIVERED
```

Переходы:

- `client`: создает `NEW`
- `florist`: `NEW -> ASSEMBLING`
- `florist`: `ASSEMBLING -> PHOTO_REVIEW`
- `florist`: `REVISION -> PHOTO_REVIEW`
- `client`: `PHOTO_REVIEW -> READY`
- `client`: `PHOTO_REVIEW -> REVISION`
- `courier`: `READY -> DELIVERING`
- `courier`: `DELIVERING -> DELIVERED`

## Фото и согласование

Фото букета перед доставкой храним локально на сервере Beget.

Сценарий:

1. Флорист загружает фото через Mini App.
2. Backend сохраняет файл в `backend/uploads/orders/`.
3. Backend переводит заказ в `PHOTO_REVIEW`.
4. Backend отправляет клиенту фото через Telegram `sendPhoto`.
5. Клиент в Mini App принимает букет (`READY`) или отправляет правки (`REVISION`).
6. При `REVISION` комментарий сохраняется в `orders.revision_note`.

Почему не Telegram file URL:

- ссылки Telegram Bot API на файлы временные;
- постоянное хранение должно быть на нашем сервере или в object storage;
- для MVP используем локальное хранилище Beget.

Ограничения загрузки:

- только изображения;
- максимум 5 MB;
- имя файла генерирует сервер;
- `uploads/` не коммитится в Git.

## Один магазин

MVP работает для одного магазина.

- логически используем `store_id = 1`;
- таблицу `stores` пока не вводим;
- `store_id` в таблицы пока не добавляем;
- мульти-магазинность добавим после стабилизации первого магазина.

## Миграция с Google Sheets

Текущий `index.html` работает на Google Sheets. Существующие листы и поля считаем референсом для переноса данных в MariaDB.
