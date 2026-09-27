-- Full schema for a FRESH install. It drops and recreates every table, so never run it
-- against a database that holds real data. database/scripts/start_db.sh only loads it
-- when the adoption_center database does not exist yet. Schema changes for existing
-- databases go in database/sql/migrations/.
CREATE DATABASE IF NOT EXISTS adoption_center;
USE adoption_center;

-- Tables are created in alphabetical order, so some foreign keys point at tables that
-- do not exist yet; checks are re-enabled at the end of the file.
SET FOREIGN_KEY_CHECKS = 0;

-- Table structure for table `adoption_applications`


DROP TABLE IF EXISTS `adoption_applications`;
CREATE TABLE `adoption_applications` (
  `application_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `dog_id` int NOT NULL,
  `status` enum('pending','under_review','approved','rejected','withdrawn') DEFAULT 'pending',
  `full_name` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `phone` varchar(20) NOT NULL,
  `housing_type` enum('house','apartment','condo','other') DEFAULT NULL,
  `has_yard` tinyint(1) DEFAULT '0',
  `has_other_pets` tinyint(1) DEFAULT '0',
  `other_pets_description` text,
  `has_children` tinyint(1) DEFAULT '0',
  `children_ages` varchar(100) DEFAULT NULL,
  `prior_pet_experience` text,
  `reason_for_adopting` text,
  `vet_reference` varchar(255) DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  `reviewer_notes` text,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `idx_user` (`user_id`),
  KEY `idx_dog` (`dog_id`),
  KEY `idx_status` (`status`),
  KEY `idx_submitted_at` (`submitted_at`),
  KEY `idx_status_submitted` (`status`,`submitted_at`),
  CONSTRAINT `adoption_applications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `adoption_applications_ibfk_2` FOREIGN KEY (`dog_id`) REFERENCES `dogs` (`dog_id`),
  CONSTRAINT `adoption_applications_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `adoptions`

DROP TABLE IF EXISTS `adoptions`;
CREATE TABLE `adoptions` (
  `adoption_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `user_id` int NOT NULL,
  `dog_id` int NOT NULL,
  `adoption_date` date NOT NULL,
  `contract_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`adoption_id`),
  KEY `application_id` (`application_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_dog` (`dog_id`),
  KEY `idx_adoption_date` (`adoption_date`),
  CONSTRAINT `adoptions_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `adoption_applications` (`application_id`),
  CONSTRAINT `adoptions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `adoptions_ibfk_3` FOREIGN KEY (`dog_id`) REFERENCES `dogs` (`dog_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `api_keys`


DROP TABLE IF EXISTS `api_keys`;
CREATE TABLE `api_keys` (
  `key_id` int NOT NULL AUTO_INCREMENT,
  `shelter_id` int NOT NULL,
  `api_key` varchar(255) NOT NULL,
  `key_name` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`key_id`),
  UNIQUE KEY `api_key` (`api_key`),
  KEY `idx_api_key` (`api_key`),
  KEY `idx_shelter` (`shelter_id`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `api_keys_ibfk_1` FOREIGN KEY (`shelter_id`) REFERENCES `shelters` (`shelter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `api_logs`

DROP TABLE IF EXISTS `api_logs`;
CREATE TABLE `api_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `key_id` int NOT NULL,
  `shelter_id` int NOT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `method` enum('POST','PUT','DELETE','GET') DEFAULT NULL,
  `payload_summary` text,
  `response_status` int DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `called_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`,`called_at`),
  KEY `idx_shelter` (`shelter_id`),
  KEY `idx_key` (`key_id`),
  KEY `idx_called_at` (`called_at`),
  KEY `idx_response_status` (`response_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `badges`

DROP TABLE IF EXISTS `badges`;
CREATE TABLE `badges` (
  `badge_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `icon_url` varchar(500) DEFAULT NULL,
  `trigger_event` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`badge_id`),
  KEY `idx_trigger` (`trigger_event`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `chat_messages`

DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE `chat_messages` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `message` text NOT NULL,
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`,`sent_at`),
  KEY `idx_session` (`session_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Table structure for table `chat_sessions`

DROP TABLE IF EXISTS `chat_sessions`;
CREATE TABLE `chat_sessions` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `dog_id` int NOT NULL,
  `shelter_id` int NOT NULL,
  `status` enum('open','closed') DEFAULT 'open',
  `started_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_dog` (`dog_id`),
  KEY `idx_shelter` (`shelter_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `chat_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `chat_sessions_ibfk_2` FOREIGN KEY (`dog_id`) REFERENCES `dogs` (`dog_id`),
  CONSTRAINT `chat_sessions_ibfk_3` FOREIGN KEY (`shelter_id`) REFERENCES `shelters` (`shelter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `dog_photos`-

DROP TABLE IF EXISTS `dog_photos`;
CREATE TABLE `dog_photos` (
  `photo_id` int NOT NULL AUTO_INCREMENT,
  `dog_id` int NOT NULL,
  `photo_url` varchar(500) NOT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `caption` varchar(255) DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`photo_id`),
  KEY `idx_dog` (`dog_id`),
  KEY `idx_primary` (`dog_id`,`is_primary`),
  CONSTRAINT `dog_photos_ibfk_1` FOREIGN KEY (`dog_id`) REFERENCES `dogs` (`dog_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Table structure for table `dogs`

DROP TABLE IF EXISTS `dogs`;
CREATE TABLE `dogs` (
  `dog_id` int NOT NULL AUTO_INCREMENT,
  `shelter_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `breed` varchar(100) DEFAULT NULL,
  `age_years` decimal(4,1) DEFAULT NULL,
  `size` enum('small','medium','large','extra_large') DEFAULT NULL,
  `gender` enum('male','female') DEFAULT NULL,
  `color` varchar(100) DEFAULT NULL,
  `weight_lbs` decimal(5,1) DEFAULT NULL,
  `description` text,
  `status` enum('available','pending','adopted','foster') DEFAULT 'available',
  `energy_level` enum('low','medium','high') NOT NULL,
  `good_with_kids` tinyint(1) DEFAULT '0',
  `good_with_dogs` tinyint(1) DEFAULT '0',
  `good_with_cats` tinyint(1) DEFAULT '0',
  `apartment_friendly` tinyint(1) DEFAULT '0',
  `requires_yard` tinyint(1) DEFAULT '0',
  `training_level` enum('none','basic','advanced') DEFAULT NULL,
  `ideal_owner_activity` enum('sedentary','moderate','active') DEFAULT NULL,
  `is_vaccinated` tinyint(1) DEFAULT '0',
  `is_spayed_neutered` tinyint(1) DEFAULT '0',
  `medical_notes` text,
  `intake_date` date DEFAULT NULL,
  `source` enum('api','manual') DEFAULT 'manual',
  `external_dog_id` varchar(255) DEFAULT NULL,
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`dog_id`),
  KEY `idx_status` (`status`),
  KEY `idx_shelter` (`shelter_id`),
  KEY `idx_breed` (`breed`),
  KEY `idx_energy` (`energy_level`),
  KEY `idx_external_id` (`external_dog_id`),
  KEY `idx_last_synced` (`last_synced_at`),
  KEY `idx_size` (`size`),
  KEY `idx_age` (`age_years`),
  KEY `idx_compatibility` (`energy_level`,`good_with_kids`,`good_with_dogs`,`apartment_friendly`),
  CONSTRAINT `dogs_ibfk_1` FOREIGN KEY (`shelter_id`) REFERENCES `shelters` (`shelter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Table structure for table `meet_greet_sessions`

DROP TABLE IF EXISTS `meet_greet_sessions`;
CREATE TABLE `meet_greet_sessions` (
  `meetup_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `dog_id` int NOT NULL,
  `shelter_id` int NOT NULL,
  `scheduled_at` datetime NOT NULL,
  `duration_minutes` int DEFAULT '30',
  `video_link` varchar(500) DEFAULT NULL,
  `status` enum('scheduled','completed','cancelled','no_show') DEFAULT 'scheduled',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`meetup_id`),
  KEY `shelter_id` (`shelter_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_dog` (`dog_id`),
  KEY `idx_scheduled_at` (`scheduled_at`),
  KEY `idx_status` (`status`),
  CONSTRAINT `meet_greet_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `meet_greet_sessions_ibfk_2` FOREIGN KEY (`dog_id`) REFERENCES `dogs` (`dog_id`),
  CONSTRAINT `meet_greet_sessions_ibfk_3` FOREIGN KEY (`shelter_id`) REFERENCES `shelters` (`shelter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Table structure for table `notifications`


DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(100) DEFAULT NULL,
  `message` text,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`,`created_at`),
  KEY `idx_user_read` (`user_id`,`is_read`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Table structure for table `pet_parks`

DROP TABLE IF EXISTS `pet_parks`;
CREATE TABLE `pet_parks` (
  `park_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `description` text,
  `amenities` text,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`park_id`),
  KEY `idx_coords` (`latitude`,`longitude`),
  KEY `idx_city` (`city`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Table structure for table `post_adoption_logs`

DROP TABLE IF EXISTS `post_adoption_logs`;
CREATE TABLE `post_adoption_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `adoption_id` int NOT NULL,
  `log_type` enum('vet_visit','feeding','training','milestone','note') DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `log_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_adoption` (`adoption_id`),
  KEY `idx_log_type` (`log_type`),
  KEY `idx_log_date` (`log_date`),
  CONSTRAINT `post_adoption_logs_ibfk_1` FOREIGN KEY (`adoption_id`) REFERENCES `adoptions` (`adoption_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Table structure for table `quiz_options`

DROP TABLE IF EXISTS `quiz_options`;
CREATE TABLE `quiz_options` (
  `option_id` int NOT NULL AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `option_text` varchar(255) NOT NULL,
  `maps_to_attribute` varchar(100) DEFAULT NULL,
  `maps_to_value` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`option_id`),
  KEY `idx_question` (`question_id`),
  KEY `idx_attribute` (`maps_to_attribute`),
  CONSTRAINT `quiz_options_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions` (`question_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Table structure for table `quiz_questions`


DROP TABLE IF EXISTS `quiz_questions`;
CREATE TABLE `quiz_questions` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `question_text` text NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `display_order` int DEFAULT NULL,
  PRIMARY KEY (`question_id`),
  KEY `idx_category` (`category`),
  KEY `idx_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- Table structure for table `quiz_results`

DROP TABLE IF EXISTS `quiz_results`;
CREATE TABLE `quiz_results` (
  `result_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `answers_json` json NOT NULL,
  `matched_dog_ids` json DEFAULT NULL,
  `taken_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`result_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_taken_at` (`taken_at`),
  CONSTRAINT `quiz_results_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- Table structure for table `resources`

DROP TABLE IF EXISTS `resources`;
CREATE TABLE `resources` (
  `resource_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `category` enum('training','nutrition','health','behavior','general') DEFAULT NULL,
  `content_type` enum('article','video','link') DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `description` text,
  `is_published` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`resource_id`),
  KEY `idx_category` (`category`),
  KEY `idx_published` (`is_published`),
  KEY `idx_content_type` (`content_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- Table structure for table `shelters`

DROP TABLE IF EXISTS `shelters`;
CREATE TABLE `shelters` (
  `shelter_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `website_url` varchar(500) DEFAULT NULL,
  `description` text,
  `logo_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`shelter_id`),
  KEY `idx_city_state` (`city`,`state`),
  KEY `idx_active` (`is_active`),
  KEY `idx_coords` (`latitude`,`longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Table structure for table `success_stories`

DROP TABLE IF EXISTS `success_stories`;
CREATE TABLE `success_stories` (
  `story_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `dog_id` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `is_approved` tinyint(1) DEFAULT '0',
  `approved_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`story_id`),
  KEY `dog_id` (`dog_id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_user` (`user_id`),
  KEY `idx_approved` (`is_approved`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `success_stories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `success_stories_ibfk_2` FOREIGN KEY (`dog_id`) REFERENCES `dogs` (`dog_id`),
  CONSTRAINT `success_stories_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Table structure for table `user_badges`

DROP TABLE IF EXISTS `user_badges`;
CREATE TABLE `user_badges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `badge_id` int NOT NULL,
  `earned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_badge` (`user_id`,`badge_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_badge` (`badge_id`),
  CONSTRAINT `user_badges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `user_badges_ibfk_2` FOREIGN KEY (`badge_id`) REFERENCES `badges` (`badge_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Table structure for table `users`

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `role` enum('adopter','shelter_admin','super_admin') DEFAULT 'adopter',
  `profile_photo_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- Table structure for table `virtual_foster`

DROP TABLE IF EXISTS `id_verifications`;
CREATE TABLE `id_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `id_one_data` mediumtext,
  `id_one_filename` varchar(255) DEFAULT NULL,
  `id_two_data` mediumtext,
  `id_two_filename` varchar(255) DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `virtual_foster`;
CREATE TABLE `virtual_foster` (
  `foster_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `dog_id` int NOT NULL,
  `sponsorship_amount` decimal(8,2) DEFAULT NULL,
  `status` enum('active','paused','ended') DEFAULT 'active',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `last_status_update` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`foster_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_dog` (`dog_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `virtual_foster_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `virtual_foster_ibfk_2` FOREIGN KEY (`dog_id`) REFERENCES `dogs` (`dog_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- Table structure for table `saved_dogs`

DROP TABLE IF EXISTS `saved_dogs`;
CREATE TABLE `saved_dogs` (
  `user_id` int NOT NULL,
  `dog_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`dog_id`),
  KEY `idx_dog` (`dog_id`),
  CONSTRAINT `saved_dogs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `saved_dogs_ibfk_2` FOREIGN KEY (`dog_id`) REFERENCES `dogs` (`dog_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ---------------------------------------------------------------------------
-- Columns the application uses that were added to production after the original
-- dump above. Reconstructed from the queries in database/src/QueryHandler.php.
-- To make this file exact, replace it with: mysqldump --no-data adoption_center
-- ---------------------------------------------------------------------------

ALTER TABLE `users`
  ADD COLUMN `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN `verification_token` varchar(64) DEFAULT NULL,
  ADD COLUMN `login_notifications` tinyint(1) NOT NULL DEFAULT 0,
  ADD KEY `idx_verification_token` (`verification_token`);

ALTER TABLE `adoption_applications`
  MODIFY `status` enum('pending','under_review','approved','rejected','withdrawn','finalized') DEFAULT 'pending';

ALTER TABLE `adoptions`
  MODIFY `adoption_date` date DEFAULT NULL,
  ADD COLUMN `finalized_by` int DEFAULT NULL,
  ADD COLUMN `notes` text,
  ADD COLUMN `adopted_at` datetime DEFAULT NULL;

ALTER TABLE `chat_sessions`
  MODIFY `dog_id` int DEFAULT NULL;

ALTER TABLE `api_keys`
  ADD COLUMN `updated_at` timestamp NULL DEFAULT NULL;

ALTER TABLE `dogs`
  RENAME COLUMN `external_dog_id` TO `external_id`;

ALTER TABLE `shelters`
  RENAME COLUMN `website_url` TO `website`,
  ADD COLUMN `external_id` varchar(255) DEFAULT NULL,
  ADD UNIQUE KEY `idx_external_id` (`external_id`);

ALTER TABLE `meet_greet_sessions`
  MODIFY `scheduled_at` datetime DEFAULT NULL,
  RENAME COLUMN `meetup_id` TO `session_id`,
  ADD COLUMN `scheduled_date` date DEFAULT NULL,
  ADD COLUMN `scheduled_time` time DEFAULT NULL;

ALTER TABLE `post_adoption_logs`
  MODIFY `adoption_id` int DEFAULT NULL,
  MODIFY `log_type` varchar(50) DEFAULT NULL,
  ADD COLUMN `user_id` int DEFAULT NULL,
  ADD COLUMN `dog_id` int DEFAULT NULL,
  ADD COLUMN `notes` text,
  ADD KEY `idx_user_dog` (`user_id`,`dog_id`);

ALTER TABLE `success_stories`
  RENAME COLUMN `content` TO `story`,
  ADD COLUMN `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending';

ALTER TABLE `virtual_foster`
  MODIFY `status` enum('active','paused','ended','cancelled') DEFAULT 'active';

SET FOREIGN_KEY_CHECKS = 1;
