-- ============================================================
--  Online Movie Ticket Booking System — Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS movie_booking;
USE movie_booking;

-- ─── USERS ────────────────────────────────────────────────
CREATE TABLE users (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100)        NOT NULL,
    email        VARCHAR(150) UNIQUE NOT NULL,
    password     VARCHAR(255)        NOT NULL,
    phone        VARCHAR(20),
    role         ENUM('USER','ADMIN') DEFAULT 'USER',
    created_at   TIMESTAMP           DEFAULT CURRENT_TIMESTAMP
);

-- ─── MOVIES ───────────────────────────────────────────────
CREATE TABLE movies (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(200)  NOT NULL,
    description  TEXT,
    genre        VARCHAR(100),
    language     VARCHAR(50),
    duration     INT           NOT NULL COMMENT 'minutes',
    rating       DECIMAL(2,1)  DEFAULT 0.0,
    release_date DATE,
    poster_url   VARCHAR(500),
    is_active    BOOLEAN       DEFAULT TRUE,
    created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ─── THEATERS ─────────────────────────────────────────────
CREATE TABLE theaters (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(200) NOT NULL,
    location     VARCHAR(300) NOT NULL,
    city         VARCHAR(100) NOT NULL,
    total_screens INT         DEFAULT 1,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─── SCREENS ──────────────────────────────────────────────
CREATE TABLE screens (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    theater_id   BIGINT      NOT NULL,
    screen_name  VARCHAR(50) NOT NULL,
    total_seats  INT         NOT NULL,
    FOREIGN KEY (theater_id) REFERENCES theaters(id) ON DELETE CASCADE
);

-- ─── SEATS ────────────────────────────────────────────────
CREATE TABLE seats (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    screen_id    BIGINT      NOT NULL,
    row_label    CHAR(2)     NOT NULL,
    seat_number  INT         NOT NULL,
    seat_type    ENUM('REGULAR','PREMIUM','RECLINER') DEFAULT 'REGULAR',
    FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE,
    UNIQUE KEY uq_seat (screen_id, row_label, seat_number)
);

-- ─── SHOWS ────────────────────────────────────────────────
CREATE TABLE shows (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    movie_id     BIGINT      NOT NULL,
    screen_id    BIGINT      NOT NULL,
    show_date    DATE        NOT NULL,
    show_time    TIME        NOT NULL,
    price_regular   DECIMAL(8,2) NOT NULL,
    price_premium   DECIMAL(8,2) NOT NULL,
    price_recliner  DECIMAL(8,2) NOT NULL,
    status       ENUM('ACTIVE','CANCELLED','COMPLETED') DEFAULT 'ACTIVE',
    created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id)  REFERENCES movies(id),
    FOREIGN KEY (screen_id) REFERENCES screens(id)
);

-- ─── BOOKINGS ─────────────────────────────────────────────
CREATE TABLE bookings (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT         NOT NULL,
    show_id          BIGINT         NOT NULL,
    booking_ref      VARCHAR(20) UNIQUE NOT NULL,
    total_amount     DECIMAL(10,2)  NOT NULL,
    status           ENUM('CONFIRMED','CANCELLED','PENDING') DEFAULT 'PENDING',
    payment_status   ENUM('PAID','REFUNDED','PENDING')       DEFAULT 'PENDING',
    payment_method   VARCHAR(50),
    booked_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (show_id) REFERENCES shows(id)
);

-- ─── BOOKING SEATS ────────────────────────────────────────
CREATE TABLE booking_seats (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    seat_id    BIGINT NOT NULL,
    price      DECIMAL(8,2) NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id)    REFERENCES seats(id),
    UNIQUE KEY uq_booking_seat (booking_id, seat_id)
);

-- ─── SHOW SEAT STATUS (availability per show) ─────────────
CREATE TABLE show_seat_status (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    show_id    BIGINT NOT NULL,
    seat_id    BIGINT NOT NULL,
    status     ENUM('AVAILABLE','BOOKED','BLOCKED') DEFAULT 'AVAILABLE',
    booking_id BIGINT,
    FOREIGN KEY (show_id)    REFERENCES shows(id),
    FOREIGN KEY (seat_id)    REFERENCES seats(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    UNIQUE KEY uq_show_seat (show_id, seat_id)
);

-- ─── SAMPLE DATA ──────────────────────────────────────────
INSERT INTO users (name, email, password, phone, role) VALUES
('Admin User',  'admin@cineplex.com', '$2a$10$placeholder_admin_hash', '9876543210', 'ADMIN'),
('John Doe',    'john@example.com',   '$2a$10$placeholder_user_hash',  '9876543211', 'USER'),
('Jane Smith',  'jane@example.com',   '$2a$10$placeholder_user_hash2', '9876543212', 'USER');

INSERT INTO movies (title, description, genre, language, duration, rating, release_date, poster_url) VALUES
('Inception',       'A thief who enters dreams to steal secrets.', 'Sci-Fi/Thriller', 'English', 148, 8.8, '2024-01-15', 'https://via.placeholder.com/300x450?text=Inception'),
('Interstellar',    'Explorers travel through a wormhole.',         'Sci-Fi/Drama',    'English', 169, 8.6, '2024-02-10', 'https://via.placeholder.com/300x450?text=Interstellar'),
('The Dark Knight', 'Batman faces the Joker in Gotham City.',       'Action/Crime',    'English', 152, 9.0, '2024-03-05', 'https://via.placeholder.com/300x450?text=Dark+Knight'),
('Pushpa 2',        'The rise of a sandalwood smuggler.',           'Action/Drama',    'Telugu',  200, 8.2, '2024-04-20', 'https://via.placeholder.com/300x450?text=Pushpa+2');

INSERT INTO theaters (name, location, city, total_screens) VALUES
('PVR Cinemas',   '100 Feet Road, Velachery',  'Chennai', 5),
('INOX Multiplex','Express Avenue Mall',        'Chennai', 4),
('Sathyam Cinemas','Royapettah High Road',      'Chennai', 6);

INSERT INTO screens (theater_id, screen_name, total_seats) VALUES
(1,'Screen 1',120),(1,'Screen 2',100),(2,'Screen 1',150),(3,'Screen 1',200);
