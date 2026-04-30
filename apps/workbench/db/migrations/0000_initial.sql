CREATE TABLE IF NOT EXISTS `schema_version` (
  `version` integer PRIMARY KEY NOT NULL,
  `applied_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `note` text
);
