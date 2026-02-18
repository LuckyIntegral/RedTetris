-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(60) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample users with hashed password 'test123'
INSERT IGNORE INTO users (username, email, password_hash) VALUES
  ('player1', 'player1@test', '$2b$10$JtWgBljSEhvrFQquc7uJou5Pbl/2rR35YaQwDRdnEw1k7CPMQZwz2'),
  ('player2', 'player2@test', '$2b$10$JtWgBljSEhvrFQquc7uJou5Pbl/2rR35YaQwDRdnEw1k7CPMQZwz2'),
  ('player3', 'player3@test', '$2b$10$JtWgBljSEhvrFQquc7uJou5Pbl/2rR35YaQwDRdnEw1k7CPMQZwz2');
