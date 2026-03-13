CREATE TABLE `props_tenants` (
    `id`           INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    `apartment_id` INTEGER NOT NULL,
    `name`         TEXT NOT NULL,
    `email`        TEXT,
    `phone`        TEXT,
    `start_date`   TEXT,
    `end_date`     TEXT,
    FOREIGN KEY (`apartment_id`) REFERENCES `props_apartments` (`id`)
);
