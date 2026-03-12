CREATE TABLE `props_apartments` (
    `id`          INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    `property_id` INTEGER NOT NULL,
    `code`        TEXT NOT NULL,
    `occupied`    INTEGER DEFAULT 0
);
