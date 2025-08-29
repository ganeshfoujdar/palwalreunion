-- District Growth Database Schema
-- Create database
CREATE DATABASE IF NOT EXISTS district_growth;
USE district_growth;

-- Users table for authentication
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mobile VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    mobile_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    status ENUM('pending', 'active', 'suspended') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Professional profiles table for storing detailed professional information
CREATE TABLE professional_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    profession VARCHAR(100) NOT NULL,
    education VARCHAR(200) NOT NULL,
    experience INT NOT NULL DEFAULT 0, -- Years of experience
    skills TEXT, -- JSON or comma-separated skills
    current_location VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    company VARCHAR(100),
    salary_range VARCHAR(50),
    availability ENUM('Available', 'Not Available', 'Open to Opportunities') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_profession (profession),
    INDEX idx_location (current_location),
    INDEX idx_education (education),
    INDEX idx_experience (experience)
);

-- Professional connections table for networking
CREATE TABLE professional_connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    recipient_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_connection (requester_id, recipient_id)
);

-- Job opportunities table
CREATE TABLE job_opportunities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    posted_by INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    company VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    salary_range VARCHAR(50),
    requirements TEXT,
    job_type ENUM('Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship') DEFAULT 'Full-time',
    status ENUM('Open', 'Closed', 'On Hold') DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_location (location),
    INDEX idx_company (company),
    INDEX idx_status (status)
);

-- Skill categories for better organization
CREATE TABLE skill_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual skills table
CREATE TABLE skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) NOT NULL UNIQUE,
    category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES skill_categories(id) ON DELETE SET NULL,
    INDEX idx_category (category_id)
);

-- User skills mapping table
CREATE TABLE user_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    skill_id INT NOT NULL,
    proficiency_level ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert') DEFAULT 'Intermediate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_skill (user_id, skill_id)
);

-- Education institutions table
CREATE TABLE institutions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(100),
    type ENUM('University', 'College', 'Institute', 'School', 'Online', 'Other') DEFAULT 'University',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User education details
CREATE TABLE user_education (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    institution_id INT,
    degree VARCHAR(100) NOT NULL,
    field_of_study VARCHAR(100),
    start_year YEAR,
    end_year YEAR,
    grade_or_gpa VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
);

-- Work experience table
CREATE TABLE work_experience (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert some sample data for skill categories
INSERT INTO skill_categories (category_name, description) VALUES
('Programming Languages', 'Various programming languages and scripting'),
('Web Development', 'Frontend and backend web development technologies'),
('Database', 'Database management and related technologies'),
('Mobile Development', 'Mobile app development platforms and frameworks'),
('Data Science', 'Data analysis, machine learning, and AI technologies'),
('DevOps', 'Development operations and infrastructure tools'),
('Design', 'UI/UX design and graphic design tools'),
('Project Management', 'Project management methodologies and tools'),
('Digital Marketing', 'Online marketing and social media tools'),
('Business Analysis', 'Business analysis and process improvement tools');

-- Insert some sample skills
INSERT INTO skills (skill_name, category_id) VALUES
-- Programming Languages
('Python', 1), ('Java', 1), ('JavaScript', 1), ('C++', 1), ('C#', 1), ('PHP', 1), ('Ruby', 1), ('Go', 1),
-- Web Development
('React', 2), ('Angular', 2), ('Vue.js', 2), ('Node.js', 2), ('Django', 2), ('Flask', 2), ('Spring Boot', 2), ('HTML/CSS', 2),
-- Database
('MySQL', 3), ('PostgreSQL', 3), ('MongoDB', 3), ('Redis', 3), ('Oracle', 3), ('SQL Server', 3),
-- Mobile Development
('React Native', 4), ('Flutter', 4), ('iOS Development', 4), ('Android Development', 4), ('Xamarin', 4),
-- Data Science
('Machine Learning', 5), ('Data Analysis', 5), ('TensorFlow', 5), ('PyTorch', 5), ('Pandas', 5), ('NumPy', 5),
-- DevOps
('Docker', 6), ('Kubernetes', 6), ('AWS', 6), ('Azure', 6), ('Jenkins', 6), ('Git', 6),
-- Design
('Photoshop', 7), ('Figma', 7), ('Sketch', 7), ('Adobe Illustrator', 7), ('UI/UX Design', 7),
-- Project Management
('Scrum', 8), ('Agile', 8), ('Jira', 8), ('Trello', 8), ('Microsoft Project', 8),
-- Digital Marketing
('SEO', 9), ('Google Analytics', 9), ('Social Media Marketing', 9), ('Content Marketing', 9), ('PPC Advertising', 9),
-- Business Analysis
('Business Process Modeling', 10), ('Requirements Analysis', 10), ('Data Modeling', 10), ('Stakeholder Management', 10);

-- OTP verification table for email and mobile verification
CREATE TABLE otp_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100),
    mobile VARCHAR(20),
    otp_code VARCHAR(6) NOT NULL,
    otp_type ENUM('email', 'mobile', 'both') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_otp_email (email),
    INDEX idx_otp_mobile (mobile),
    INDEX idx_otp_expires (expires_at)
);

-- Admin users table for management access
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'manager', 'viewer') DEFAULT 'admin',
    permissions JSON,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Admin activity log table
CREATE TABLE admin_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type ENUM('user', 'profile', 'feedback', 'system') NOT NULL,
    target_id INT,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE,
    INDEX idx_admin_activity_date (created_at),
    INDEX idx_admin_activity_action (action)
);

-- Feedback and suggestions table
CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    feedback_type ENUM('Bug Report', 'Feature Request', 'General Feedback', 'Suggestion', 'Complaint', 'Appreciation') NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    rating INT DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    user_id INT,
    status ENUM('New', 'In Progress', 'Resolved', 'Closed') DEFAULT 'New',
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_feedback_type (feedback_type),
    INDEX idx_feedback_status (status),
    INDEX idx_feedback_created (created_at)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_profiles_user_location ON professional_profiles(user_id, current_location);
CREATE INDEX idx_profiles_profession_location ON professional_profiles(profession, current_location);
CREATE INDEX idx_job_opportunities_location_status ON job_opportunities(location, status);

-- Create a view for professional search with aggregated data
CREATE VIEW professional_search_view AS
SELECT 
    pp.id,
    pp.user_id,
    u.username,
    u.email as user_email,
    u.mobile as user_mobile,
    pp.full_name,
    pp.profession,
    pp.education,
    pp.experience,
    pp.current_location,
    pp.phone,
    pp.email as profile_email,
    pp.company,
    pp.salary_range,
    pp.availability,
    GROUP_CONCAT(s.skill_name) as skills_list,
    pp.created_at,
    pp.updated_at
FROM professional_profiles pp
JOIN users u ON pp.user_id = u.id
LEFT JOIN user_skills us ON pp.user_id = us.user_id
LEFT JOIN skills s ON us.skill_id = s.id
GROUP BY pp.id, pp.user_id, u.username, u.email, u.mobile, pp.full_name, pp.profession, 
         pp.education, pp.experience, pp.current_location, pp.phone, pp.email, pp.company, 
         pp.salary_range, pp.availability, pp.created_at, pp.updated_at;

-- Insert default admin user
INSERT INTO admin_users (username, email, password, full_name, role, permissions) VALUES
('admin', 'admin@districtgrowth.com', SHA2('admin123', 256), 'System Administrator', 'admin', 
 '{"can_view_users": true, "can_edit_users": true, "can_delete_users": true, "can_export_data": true, "can_manage_feedback": true}');

-- Insert sample admin users for management team
INSERT INTO admin_users (username, email, password, full_name, role, permissions) VALUES
('manager1', 'manager1@districtgrowth.com', SHA2('manager123', 256), 'District Manager', 'manager', 
 '{"can_view_users": true, "can_edit_users": false, "can_delete_users": false, "can_export_data": true, "can_manage_feedback": true}'),
('viewer1', 'viewer1@districtgrowth.com', SHA2('viewer123', 256), 'Data Analyst', 'viewer', 
 '{"can_view_users": true, "can_edit_users": false, "can_delete_users": false, "can_export_data": true, "can_manage_feedback": false}');
