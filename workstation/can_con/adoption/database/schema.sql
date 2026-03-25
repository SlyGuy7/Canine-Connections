SET FOREIGN_KEY_CHECKS = 0;

-- USERS

CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  role ENUM('adopter', 'shelter_admin', 'super_admin') DEFAULT 'adopter',
  profile_photo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- SHELTERS

CREATE TABLE shelters (
  shelter_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  email VARCHAR(255),
  website_url VARCHAR(500),
  description TEXT,
  logo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_city_state (city, state),
  INDEX idx_active (is_active),
  INDEX idx_coords (latitude, longitude)
);

-- API_KEYS

CREATE TABLE api_keys (
  key_id INT PRIMARY KEY AUTO_INCREMENT,
  shelter_id INT NOT NULL,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  key_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shelter_id) REFERENCES shelters(shelter_id),
  INDEX idx_api_key (api_key),
  INDEX idx_shelter (shelter_id),
  INDEX idx_active (is_active)
);

-- API_LOGS 

CREATE TABLE api_logs (
  log_id INT NOT NULL AUTO_INCREMENT,
  key_id INT NOT NULL,
  shelter_id INT NOT NULL,
  endpoint VARCHAR(255),
  method ENUM('POST', 'PUT', 'DELETE', 'GET'),
  payload_summary TEXT,
  response_status INT,
  ip_address VARCHAR(45),
  called_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id, called_at),
  INDEX idx_shelter (shelter_id),
  INDEX idx_key (key_id),
  INDEX idx_called_at (called_at),
  INDEX idx_response_status (response_status)
)
PARTITION BY RANGE (YEAR(called_at)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p2027 VALUES LESS THAN (2028),
  PARTITION pfuture VALUES LESS THAN MAXVALUE
);

-- DOGS

CREATE TABLE dogs (
  dog_id INT PRIMARY KEY AUTO_INCREMENT,
  shelter_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  breed VARCHAR(100),
  age_years DECIMAL(4,1),
  size ENUM('small', 'medium', 'large', 'extra_large'),
  gender ENUM('male', 'female'),
  color VARCHAR(100),
  weight_lbs DECIMAL(5,1),
  description TEXT,
  status ENUM('available', 'pending', 'adopted', 'foster') DEFAULT 'available',
  energy_level ENUM('low', 'medium', 'high') NOT NULL,
  good_with_kids BOOLEAN DEFAULT FALSE,
  good_with_dogs BOOLEAN DEFAULT FALSE,
  good_with_cats BOOLEAN DEFAULT FALSE,
  apartment_friendly BOOLEAN DEFAULT FALSE,
  requires_yard BOOLEAN DEFAULT FALSE,
  training_level ENUM('none', 'basic', 'advanced'),
  ideal_owner_activity ENUM('sedentary', 'moderate', 'active'),
  is_vaccinated BOOLEAN DEFAULT FALSE,
  is_spayed_neutered BOOLEAN DEFAULT FALSE,
  medical_notes TEXT,
  intake_date DATE,
  source ENUM('api', 'manual') DEFAULT 'manual',
  external_dog_id VARCHAR(255),
  last_synced_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shelter_id) REFERENCES shelters(shelter_id),
  INDEX idx_status (status),
  INDEX idx_shelter (shelter_id),
  INDEX idx_breed (breed),
  INDEX idx_energy (energy_level),
  INDEX idx_external_id (external_dog_id),
  INDEX idx_last_synced (last_synced_at),
  INDEX idx_size (size),
  INDEX idx_age (age_years),
  INDEX idx_compatibility (energy_level, good_with_kids, good_with_dogs, apartment_friendly)
);

-- DOG_PHOTOS

CREATE TABLE dog_photos (
  photo_id INT PRIMARY KEY AUTO_INCREMENT,
  dog_id INT NOT NULL,
  photo_url VARCHAR(500) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  caption VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dog_id) REFERENCES dogs(dog_id) ON DELETE CASCADE,
  INDEX idx_dog (dog_id),
  INDEX idx_primary (dog_id, is_primary)
);

-- ADOPTION_APPLICATIONS

CREATE TABLE adoption_applications (
  application_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  dog_id INT NOT NULL,
  status ENUM('pending', 'under_review', 'approved', 'rejected', 'withdrawn') DEFAULT 'pending',
  full_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  housing_type ENUM('house', 'apartment', 'condo', 'other'),
  has_yard BOOLEAN DEFAULT FALSE,
  has_other_pets BOOLEAN DEFAULT FALSE,
  other_pets_description TEXT,
  has_children BOOLEAN DEFAULT FALSE,
  children_ages VARCHAR(100),
  prior_pet_experience TEXT,
  reason_for_adopting TEXT,
  vet_reference VARCHAR(255),
  reviewed_by INT,
  reviewer_notes TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (dog_id) REFERENCES dogs(dog_id),
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id),
  INDEX idx_user (user_id),
  INDEX idx_dog (dog_id),
  INDEX idx_status (status),
  INDEX idx_submitted_at (submitted_at),
  INDEX idx_status_submitted (status, submitted_at)
);

-- QUIZ_QUESTIONS

CREATE TABLE quiz_questions (
  question_id INT PRIMARY KEY AUTO_INCREMENT,
  question_text TEXT NOT NULL,
  category VARCHAR(100),
  display_order INT,
  INDEX idx_category (category),
  INDEX idx_display_order (display_order)
);

-- QUIZ_OPTIONS

CREATE TABLE quiz_options (
  option_id INT PRIMARY KEY AUTO_INCREMENT,
  question_id INT NOT NULL,
  option_text VARCHAR(255) NOT NULL,
  maps_to_attribute VARCHAR(100),
  maps_to_value VARCHAR(100),
  FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE CASCADE,
  INDEX idx_question (question_id),
  INDEX idx_attribute (maps_to_attribute)
);

-- QUIZ_RESULTS

CREATE TABLE quiz_results (
  result_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  answers_json JSON NOT NULL,
  matched_dog_ids JSON,
  taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  INDEX idx_user (user_id),
  INDEX idx_taken_at (taken_at)
);

-- ADOPTIONS

CREATE TABLE adoptions (
  adoption_id INT PRIMARY KEY AUTO_INCREMENT,
  application_id INT NOT NULL,
  user_id INT NOT NULL,
  dog_id INT NOT NULL,
  adoption_date DATE NOT NULL,
  contract_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES adoption_applications(application_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (dog_id) REFERENCES dogs(dog_id),
  INDEX idx_user (user_id),
  INDEX idx_dog (dog_id),
  INDEX idx_adoption_date (adoption_date)
);

-- POST_ADOPTION_LOGS

CREATE TABLE post_adoption_logs (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  adoption_id INT NOT NULL,
  log_type ENUM('vet_visit', 'feeding', 'training', 'milestone', 'note'),
  title VARCHAR(255),
  description TEXT,
  log_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (adoption_id) REFERENCES adoptions(adoption_id),
  INDEX idx_adoption (adoption_id),
  INDEX idx_log_type (log_type),
  INDEX idx_log_date (log_date)
);

-- VIRTUAL_FOSTER

CREATE TABLE virtual_foster (
  foster_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  dog_id INT NOT NULL,
  sponsorship_amount DECIMAL(8,2),
  status ENUM('active', 'paused', 'ended') DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  last_status_update TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (dog_id) REFERENCES dogs(dog_id),
  INDEX idx_user (user_id),
  INDEX idx_dog (dog_id),
  INDEX idx_status (status)
);

-- PET_PARKS

CREATE TABLE pet_parks (
  park_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  description TEXT,
  amenities TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_coords (latitude, longitude),
  INDEX idx_city (city),
  INDEX idx_active (is_active)
);

-- RESOURCES

CREATE TABLE resources (
  resource_id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  category ENUM('training', 'nutrition', 'health', 'behavior', 'general'),
  content_type ENUM('article', 'video', 'link'),
  url VARCHAR(500),
  description TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_published (is_published),
  INDEX idx_content_type (content_type)
);

-- SUCCESS_STORIES

CREATE TABLE success_stories (
  story_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  dog_id INT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  photo_url VARCHAR(500),
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (dog_id) REFERENCES dogs(dog_id),
  FOREIGN KEY (approved_by) REFERENCES users(user_id),
  INDEX idx_user (user_id),
  INDEX idx_approved (is_approved),
  INDEX idx_created_at (created_at)
);

-- BADGES

CREATE TABLE badges (
  badge_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  trigger_event VARCHAR(100),
  INDEX idx_trigger (trigger_event)
);

-- USER_BADGES

CREATE TABLE user_badges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  badge_id INT NOT NULL,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (badge_id) REFERENCES badges(badge_id),
  INDEX idx_user (user_id),
  INDEX idx_badge (badge_id),
  UNIQUE KEY unique_user_badge (user_id, badge_id)
);

-- CHAT_SESSIONS

CREATE TABLE chat_sessions (
  session_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  dog_id INT NOT NULL,
  shelter_id INT NOT NULL,
  status ENUM('open', 'closed') DEFAULT 'open',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (dog_id) REFERENCES dogs(dog_id),
  FOREIGN KEY (shelter_id) REFERENCES shelters(shelter_id),
  INDEX idx_user (user_id),
  INDEX idx_dog (dog_id),
  INDEX idx_shelter (shelter_id),
  INDEX idx_status (status)
);


-- CHAT_MESSAGES 

CREATE TABLE chat_messages (
  message_id INT NOT NULL AUTO_INCREMENT,
  session_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, sent_at),
  INDEX idx_session (session_id),
  INDEX idx_sender (sender_id),
  INDEX idx_sent_at (sent_at)
)
PARTITION BY RANGE (YEAR(sent_at)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p2027 VALUES LESS THAN (2028),
  PARTITION pfuture VALUES LESS THAN MAXVALUE
);

-- MEET_GREET_SESSIONS

CREATE TABLE meet_greet_sessions (
  meetup_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  dog_id INT NOT NULL,
  shelter_id INT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  duration_minutes INT DEFAULT 30,
  video_link VARCHAR(500),
  status ENUM('scheduled', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (dog_id) REFERENCES dogs(dog_id),
  FOREIGN KEY (shelter_id) REFERENCES shelters(shelter_id),
  INDEX idx_user (user_id),
  INDEX idx_dog (dog_id),
  INDEX idx_scheduled_at (scheduled_at),
  INDEX idx_status (status)
);

-- NOTIFICATIONS 

CREATE TABLE notifications (
  notification_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(100),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id, created_at),
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_type (type)
)
PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p2027 VALUES LESS THAN (2028),
  PARTITION pfuture VALUES LESS THAN MAXVALUE
);

SET FOREIGN_KEY_CHECKS = 1;