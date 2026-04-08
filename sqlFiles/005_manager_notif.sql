CREATE TABLE IF NOT EXISTS manager_notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    source_table VARCHAR(50),
    source_id INT,
    message TEXT,
    created_at DATETIME DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);