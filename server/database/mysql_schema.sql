-- Workshop Job Tracker — MySQL Schema
-- Import this file into your cPanel MySQL database via phpMyAdmin

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    updated_at DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
);

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    updated_at DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
);

-- 3. Technicians
CREATE TABLE IF NOT EXISTS technicians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    phone VARCHAR(50),
    created_at DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Devices (moved before jobs so FK works)
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year SMALLINT,
    serial_number VARCHAR(50),
    device_type VARCHAR(50),
    created_at DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 5. Workshop Jobs
CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    device_id INT,
    technician_id INT,
    created_by INT NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    problem_description TEXT NOT NULL,
    status ENUM('pending', 'assigned', 'in_progress', 'waiting_parts', 'done_pending_verification', 'completed', 'delivered') NOT NULL DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    date_in DATETIME NOT NULL DEFAULT NOW(),
    date_out DATETIME,
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    final_cost DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    updated_at DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
    FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 6. Spare Parts
CREATE TABLE IF NOT EXISTS parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100) UNIQUE,
    stock_qty INT NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    reorder_level INT DEFAULT 5,
    supplier VARCHAR(255),
    category VARCHAR(100),
    created_at DATETIME NOT NULL DEFAULT NOW(),
    updated_at DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
);

-- 7. Job Parts
CREATE TABLE IF NOT EXISTS job_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    part_id INT NOT NULL,
    quantity_used INT NOT NULL DEFAULT 1,
    unit_price_at_time DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT
);

-- 8. Job Notes
CREATE TABLE IF NOT EXISTS job_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    employee_id INT NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL UNIQUE,
    labor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    parts_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.10,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_status ENUM('unpaid', 'paid', 'partial') NOT NULL DEFAULT 'unpaid',
    issued_at DATETIME NOT NULL DEFAULT NOW(),
    paid_at DATETIME,
    notes TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- 10. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id INT,
    details TEXT,
    ip_address VARCHAR(50),
    created_at DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
-- 11. Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes (using IF NOT EXISTS pattern via DROP + CREATE to avoid duplicates)
DROP INDEX IF EXISTS idx_password_resets_user ON password_resets;
CREATE INDEX idx_password_resets_user ON password_resets(user_id);

DROP INDEX IF EXISTS idx_password_resets_code ON password_resets;
CREATE INDEX idx_password_resets_code ON password_resets(code);
DROP INDEX IF EXISTS idx_devices_customer ON devices;
CREATE INDEX idx_devices_customer ON devices(customer_id);

DROP INDEX IF EXISTS idx_jobs_customer ON jobs;
CREATE INDEX idx_jobs_customer ON jobs(customer_id);

DROP INDEX IF EXISTS idx_jobs_device ON jobs;
CREATE INDEX idx_jobs_device ON jobs(device_id);

DROP INDEX IF EXISTS idx_jobs_technician ON jobs;
CREATE INDEX idx_jobs_technician ON jobs(technician_id);

DROP INDEX IF EXISTS idx_jobs_status ON jobs;
CREATE INDEX idx_jobs_status ON jobs(status);

DROP INDEX IF EXISTS idx_job_parts_job ON job_parts;
CREATE INDEX idx_job_parts_job ON job_parts(job_id);

DROP INDEX IF EXISTS idx_job_notes_job ON job_notes;
CREATE INDEX idx_job_notes_job ON job_notes(job_id);

DROP INDEX IF EXISTS idx_invoices_job ON invoices;
CREATE INDEX idx_invoices_job ON invoices(job_id);

DROP INDEX IF EXISTS idx_audit_log_user ON audit_log;
CREATE INDEX idx_audit_log_user ON audit_log(user_id);

-- Seed default admin user (password: admin123)
INSERT IGNORE INTO users (username, email, password_hash, full_name, role)
VALUES (
    'admin',
    'admin@workshop.com',
    '$2a$10$bOHBjqJEixwefD5WJNj/MeENVmnxjYJYD7IP/ETkAcCch.1LWeWw6',
    'System Admin',
    'admin'
);

SET FOREIGN_KEY_CHECKS = 1;
