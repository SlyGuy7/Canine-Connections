-- Adds the saved_dogs table used by the "Saved Dogs" feature. It was missing from schema.sql.
-- Safe to run on a database that already has it.
USE adoption_center;

CREATE TABLE IF NOT EXISTS `saved_dogs` (
  `user_id` int NOT NULL,
  `dog_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`dog_id`),
  KEY `idx_dog` (`dog_id`),
  CONSTRAINT `saved_dogs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `saved_dogs_ibfk_2` FOREIGN KEY (`dog_id`) REFERENCES `dogs` (`dog_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
