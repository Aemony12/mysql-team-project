USE museumdb;

INSERT INTO users (id, name, email, password, role, is_active, employee_id, membership_id)
VALUES
    (1, 'John Smith', 'member@example.com', 'member123', 'user', TRUE, NULL, 2),
    (2, 'supervisor', 'supervisor@example.com', 'supervisor123', 'supervisor', TRUE, 1, NULL),
    (3, 'curator', 'curator@example.com', 'curator123', 'curator', TRUE, 3, NULL),
    (4, 'employee', 'employee@example.com', 'employee123', 'employee', TRUE, 2, NULL),
    (5, 'clerk', 'clerk@example.com', 'clerk123', 'admissions', TRUE, 16, NULL),
    (6, 'giftshop', 'giftshop@example.com', 'giftshop123', 'giftshop', TRUE, 17, NULL),
    (7, 'cafe', 'cafe@example.com', 'cafe123', 'cafe', TRUE, 18, NULL),
    (8, 'marketing', 'marketing@example.com', 'marketing123', 'supervisor', TRUE, 28, NULL)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    email = VALUES(email),
    password = VALUES(password),
    role = VALUES(role),
    is_active = VALUES(is_active),
    employee_id = VALUES(employee_id),
    membership_id = VALUES(membership_id);
