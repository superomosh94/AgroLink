-- AgroLink Database Schema

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS agrolink;
USE agrolink;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fullname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('farmer', 'buyer', 'supplier', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_user_type (user_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products table
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    seller_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category ENUM('seeds', 'fertilizers', 'equipment', 'produce', 'livestock', 'other') NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    unit VARCHAR(50),
    location VARCHAR(255),
    condition_type ENUM('new', 'used', 'refurbished') DEFAULT 'new',
    is_organic BOOLEAN DEFAULT FALSE,
    delivery_available BOOLEAN DEFAULT FALSE,
    warranty_included BOOLEAN DEFAULT FALSE,
    image_url VARCHAR(255),
    status ENUM('active', 'sold', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_category (category),
    INDEX idx_seller (seller_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders table
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_buyer (buyer_id),
    INDEX idx_seller (seller_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order items table
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price_at_purchase DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample data for testing
-- Password for all users: the password that corresponds to hash '$2b$10$ju6Akc2NtVAca6tuhkrQseiGJL0Lya38t8UlhfgTMCA5SKHoxRSHW'
INSERT INTO users (fullname, email, phone, password_hash, user_type) VALUES
('Admin User', 'admin@agrolink.com', '+1-555-0100', '$2b$10$ju6Akc2NtVAca6tuhkrQseiGJL0Lya38t8UlhfgTMCA5SKHoxRSHW', 'admin'),
('John Farmer', 'farmer@agrolink.com', '+1-555-0101', '$2b$10$ju6Akc2NtVAca6tuhkrQseiGJL0Lya38t8UlhfgTMCA5SKHoxRSHW', 'farmer'),
('Sarah Buyer', 'buyer@agrolink.com', '+1-555-0102', '$2b$10$ju6Akc2NtVAca6tuhkrQseiGJL0Lya38t8UlhfgTMCA5SKHoxRSHW', 'buyer'),
('Mike Supplier', 'supplier@agrolink.com', '+1-555-0103', '$2b$10$ju6Akc2NtVAca6tuhkrQseiGJL0Lya38t8UlhfgTMCA5SKHoxRSHW', 'supplier');

INSERT INTO products (seller_id, name, description, category, price, stock_quantity, unit, location, is_organic, delivery_available) VALUES
(2, 'Organic Fertilizer', 'High-quality organic fertilizer for all crops. Rich in nutrients and perfect for sustainable farming.', 'fertilizers', 45.99, 100, 'bag', 'Iowa, USA', TRUE, TRUE),
(2, 'Hybrid Corn Seeds', 'Premium hybrid corn seeds with high yield and disease resistance. Perfect for commercial farming.', 'seeds', 89.99, 250, 'kg', 'California, USA', TRUE, TRUE),
(4, 'Irrigation System', 'Modern drip irrigation system with smart controls. Saves water and increases crop yield.', 'equipment', 349.99, 15, 'piece', 'Texas, USA', FALSE, TRUE),
(2, 'Fresh Tomatoes', 'Organic vine-ripened tomatoes, freshly harvested. Perfect for restaurants and grocers.', 'produce', 75.00, 500, 'kg', 'Florida, USA', TRUE, TRUE),
(4, 'Premium Pesticide', 'Eco-friendly pesticide that is safe for crops and effective against pests.', 'fertilizers', 65.00, 80, 'liter', 'Ohio, USA', FALSE, TRUE),
(2, 'Vegetable Seeds Pack', 'Mixed vegetable seeds including lettuce, carrots, and radishes. Great for home gardens.', 'seeds', 25.99, 200, 'pack', 'Oregon, USA', TRUE, FALSE);
