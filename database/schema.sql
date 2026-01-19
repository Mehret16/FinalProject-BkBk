-- Mental Health Support Chatbot Database Schema
-- Created for Ethiopia-based system with bilingual support

-- Create Database
CREATE DATABASE IF NOT EXISTS mental_health_chatbot;
USE mental_health_chatbot;

-- ============================================
-- 1. ROLES TABLE
-- ============================================
CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default roles
INSERT INTO roles (name, description) VALUES
('patient', 'Patient seeking mental health support'),
('therapist', 'Professional therapist providing support and referrals'),
('admin', 'System administrator with full access');

-- ============================================
-- 2. USERS TABLE
-- ============================================
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  date_of_birth DATE,
  gender ENUM('male', 'female', 'other') DEFAULT 'other',
  role_id INT NOT NULL,
  language_preference ENUM('en', 'am') DEFAULT 'en',
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  KEY idx_email (email),
  KEY idx_username (username),
  KEY idx_role_id (role_id),
  KEY idx_is_active (is_active),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. THERAPIST SPECIALIZATIONS
-- ============================================
CREATE TABLE therapist_specializations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  therapist_id INT NOT NULL UNIQUE,
  specializations JSON,
  bio TEXT,
  license_number VARCHAR(100),
  license_expiry DATE,
  years_of_experience INT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_therapist_id (therapist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. CHAT SESSIONS TABLE
-- ============================================
CREATE TABLE chat_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  language ENUM('en', 'am') DEFAULT 'en',
  detected_sentiment VARCHAR(50),
  distress_level INT DEFAULT 0,
  is_escalated BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT,
  escalated_at TIMESTAMP NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  closed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_patient_id (patient_id),
  KEY idx_is_escalated (is_escalated),
  KEY idx_is_closed (is_closed),
  KEY idx_session_token (session_token),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  sender_type ENUM('patient', 'chatbot', 'therapist') NOT NULL,
  message_text TEXT NOT NULL,
  language ENUM('en', 'am') DEFAULT 'en',
  intent VARCHAR(100),
  sentiment_score DECIMAL(3, 2),
  emotion_label VARCHAR(50),
  distress_keywords JSON,
  nlp_metadata JSON,
  is_anonymized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  KEY idx_session_id (session_id),
  KEY idx_sender_type (sender_type),
  KEY idx_created_at (created_at),
  KEY idx_language (language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. MENTAL HEALTH RESOURCES TABLE
-- ============================================
CREATE TABLE mental_health_resources (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title_en VARCHAR(255) NOT NULL,
  title_am VARCHAR(255),
  description_en TEXT NOT NULL,
  description_am TEXT,
  category VARCHAR(100) NOT NULL,
  language ENUM('en', 'am', 'both') DEFAULT 'both',
  content_url VARCHAR(500),
  resource_type VARCHAR(50),
  is_published BOOLEAN DEFAULT FALSE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_category (category),
  KEY idx_language (language),
  KEY idx_is_published (is_published),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. REFERRALS TABLE (Patient -> Therapist)
-- ============================================
CREATE TABLE referrals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  referred_to_therapist_id INT,
  referral_type ENUM('therapy', 'program', 'emergency') DEFAULT 'therapy',
  reason TEXT NOT NULL,
  urgency ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('pending', 'accepted', 'rejected', 'completed') DEFAULT 'pending',
  notes TEXT,
  access_token VARCHAR(255),
  access_granted_at TIMESTAMP NULL,
  therapist_notified_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_to_therapist_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_patient_id (patient_id),
  KEY idx_therapist_id (referred_to_therapist_id),
  KEY idx_status (status),
  KEY idx_access_token (access_token),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. THERAPIST ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE therapist_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  therapist_id INT NOT NULL,
  patient_id INT NOT NULL,
  referral_id INT,
  assignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_assignment (therapist_id, patient_id),
  FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL,
  KEY idx_therapist_id (therapist_id),
  KEY idx_patient_id (patient_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. REPORTS TABLE
-- ============================================
CREATE TABLE reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_type VARCHAR(100) NOT NULL,
  generated_by INT NOT NULL,
  patient_id INT,
  data JSON NOT NULL,
  filters JSON,
  format ENUM('json', 'csv', 'pdf') DEFAULT 'json',
  file_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (generated_by) REFERENCES users(id),
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_report_type (report_type),
  KEY idx_generated_by (generated_by),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id INT,
  changes JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_user_id (user_id),
  KEY idx_action (action),
  KEY idx_created_at (created_at),
  KEY idx_resource (resource_type, resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 11. REFRESH TOKENS TABLE
-- ============================================
CREATE TABLE refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_user_id (user_id),
  KEY idx_expires_at (expires_at),
  KEY idx_token_hash (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 12. CONSENT TRACKING TABLE
-- ============================================
CREATE TABLE consent_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  consent_type VARCHAR(100) NOT NULL,
  consented BOOLEAN DEFAULT FALSE,
  version VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_user_id (user_id),
  KEY idx_consent_type (consent_type),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Create Indexes for Performance
-- ============================================
CREATE INDEX idx_chat_messages_sentiment ON chat_messages(sentiment_score);
CREATE INDEX idx_chat_messages_emotion ON chat_messages(emotion_label);
CREATE INDEX idx_therapist_assignments_created ON therapist_assignments(created_at);
CREATE INDEX idx_referrals_created ON referrals(created_at);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);
