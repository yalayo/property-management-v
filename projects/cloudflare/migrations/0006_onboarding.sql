CREATE TABLE `props_onboarding` (
    `id`           INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    `apartment_id` INTEGER NOT NULL,
    `email`        TEXT NOT NULL,
    `status`       TEXT NOT NULL DEFAULT 'pending',
    `created_at`   TEXT NOT NULL DEFAULT (datetime('now')),
    `updated_at`   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (`apartment_id`) REFERENCES `props_apartments` (`id`)
);
