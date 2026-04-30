CREATE TABLE IF NOT EXISTS `data_connection` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `kind` text NOT NULL,
  `base_url` text NOT NULL,
  `auth_type` text NOT NULL,
  `auth_token` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `last_capability_at` text,
  `last_capability_status` text,
  `last_capability_fhir_version` text,
  `last_capability_software` text,
  `last_capability_json` text,
  `last_capability_error` text
);
