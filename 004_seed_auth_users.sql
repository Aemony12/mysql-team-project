USE teamdb;

INSERT INTO users (name, email, password, role, is_active, membership_id)
VALUES
    ('Museum Member', 'member@example.com', 'member123', 'user', TRUE, 1)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    password = VALUES(password),
    role = VALUES(role),
    is_active = VALUES(is_active),
    membership_id = VALUES(membership_id);

INSERT INTO users (name, email, password, role, is_active, employee_id)
VALUES
    ('Staff Employee', 'employee@example.com', 'employee123', 'employee', TRUE, 1),
    ('Lead Supervisor', 'supervisor@example.com', 'supervisor123', 'supervisor', TRUE, 2)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    password = VALUES(password),
    role = VALUES(role),
    is_active = VALUES(is_active),
    employee_id = VALUES(employee_id);
