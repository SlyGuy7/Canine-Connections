-- Users of the system (adopters, admins)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Animals available for adoption
CREATE TABLE IF NOT EXISTS animals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    species VARCHAR(50) NOT NULL,  -- e.g. Dogs
    breed VARCHAR(100),
    age INT,
    gender ENUM('male', 'female', 'unknown') DEFAULT 'unknown',
    description TEXT,
    status ENUM('available', 'pending', 'adopted') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adoption applications submitted by users
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    animal_id INT NOT NULL,
    status ENUM('submitted', 'reviewing', 'approved', 'rejected') DEFAULT 'submitted',
    notes TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (animal_id) REFERENCES animals(id)
);