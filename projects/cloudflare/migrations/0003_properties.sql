CREATE TABLE `properties` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    `user_id` TEXT NOT NULL,
    `name` TEXT NOT NULL,
    `address` TEXT NOT NULL,
    `city` TEXT NOT NULL,
    `postal_code` TEXT NOT NULL,
    `country` TEXT DEFAULT 'Germany',
    `units` INTEGER DEFAULT 1,
    `acquisition_date` TEXT,
    `purchase_price` INTEGER,
    `current_value` INTEGER
);
