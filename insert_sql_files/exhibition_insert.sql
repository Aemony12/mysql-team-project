--exhibitions, events and tours


-- Create two exhibitions
--@block
INSERT INTO Exhibition (Exhibition_Name, Starting_Date, Ending_Date)
VALUES 
    ('Spring Collection 2026', CURDATE(), '2026-05-12'),
    ('Summer Showcase 2026', '2026-06-12', '2026-08-14');

-- Assign artworks to exhibitions
-- Spring exhibition gets the first 6 artworks (by Title)
-- Summer exhibition gets the remaining 6

-- We'll use subqueries to find them by name.

--@block
-- Spring assignments (by artist)
INSERT INTO Exhibition_Artwork (Display_Room, Date_Installed, Exhibition_ID, Artwork_ID, Created_By, Created_At)
SELECT 
    'Main Gallery',
    CURDATE(),
    (SELECT Exhibition_ID FROM Exhibition WHERE Exhibition_Name = 'Spring Collection 2026'),
    a.Artwork_ID,
    'exhibition_planner',
    CURDATE()
FROM Artwork a
JOIN Artist ar ON a.Artist_ID = ar.Artist_ID
WHERE ar.Artist_Name IN (
    'Hans von Aachen',
    'Carl Frederik Aagaard',
    'Giulio Clovio',
    'Giovanni di Balduccio',
    'Albrecht Dürer',
    'Johann Paul Egell'
);

--@block
-- Summer assignments (by artist)
INSERT INTO Exhibition_Artwork (Display_Room, Date_Installed, Exhibition_ID, Artwork_ID, Created_By, Created_At)
SELECT 
    'East Wing',
    CURDATE(),
    (SELECT Exhibition_ID FROM Exhibition WHERE Exhibition_Name = 'Summer Showcase 2026'),
    a.Artwork_ID,
    'exhibition_planner',
    CURDATE()
FROM Artwork a
JOIN Artist ar ON a.Artist_ID = ar.Artist_ID
WHERE ar.Artist_Name IN (
    'John Henry Fuseli',
    'Vincent van Gogh',
    'Jean-Auguste-Dominique Ingres',
    'Jacopo da Empoli',
    'Friedrich Kerseboom',
    'Nicolas Lancret'
);

--@block
--error Cannot add or update a child row: a foreign key constraint fails (`museumdb`.`event`, CONSTRAINT `fk_Event_Coordinator` FOREIGN KEY (`coordinator_ID`) REFERENCES `employee` (`Employee_ID`))
INSERT INTO Event (event_Name, start_Date, end_Date, member_only, coordinator_ID, created_by, created_at, updated_by, updated_at, Max_capacity) VALUES
('Spring Exhibition Opening Gala', '2026-04-15', '2026-04-15', FALSE, 1, 'system', CURDATE(), 'system', CURDATE(), 200),
('Art History: Renaissance', '2026-04-22', '2026-04-22', FALSE, 5, 'system', CURDATE(), 'system', CURDATE(), 80),
('Members-Only: Summer Showcase', '2026-06-10', '2026-06-10', TRUE, 2, 'system', CURDATE(), 'system', CURDATE(), 150),
('Family Art Workshop', '2026-04-25', '2026-04-25', FALSE, 75, 'system', CURDATE(), 'system', CURDATE(), 30),
('Curator Special: Van Gogh', '2026-05-05', '2026-05-05', FALSE, 85, 'system', CURDATE(), 'system', CURDATE(), 60),
('Evening Jazz & Art', '2026-05-15', '2026-05-15', FALSE, 96, 'system', CURDATE(), 'system', CURDATE(), 120),
('Summer Solstice Celebration', '2026-06-20', '2026-06-20', FALSE, 101, 'system', CURDATE(), 'system', CURDATE(), 250),
('Conservation Workshop', '2026-07-10', '2026-07-12', FALSE, 103, 'system', CURDATE(), 'system', CURDATE(), 25);

--@block
-- error Cannot add or update a child row: a foreign key constraint fails (`museumdb`.`event_registration`, CONSTRAINT `fk_Reg_Event` FOREIGN KEY (`Event_ID`) REFERENCES `event` (`event_ID`))
INSERT INTO event_registration (Registration_Date, Event_ID, Membership_ID, Ticket_ID, Created_By, Created_At, Updated_By, Updated_At) VALUES
('2026-04-01', 49, 2, 1, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-01', 49, 3, 2, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-02', 53, 4, 3, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-05', 50, 5, 4, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-10', 53, 3, 6, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-12', 53, 2, 7, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-15', 55, 6, 5, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-18', 56, 3, 8, 'system', CURDATE(), 'system', CURDATE()),
('2026-04-20', 51, 3, 2, 'system', CURDATE(), 'system', CURDATE()),
('2026-05-01', 54, 4, 3, 'system', CURDATE(), 'system', CURDATE());

--@block
-- error Cannot add or update a child row: a foreign key constraint fails (`museumdb`.`tour`, CONSTRAINT `fk_tour_guide` FOREIGN KEY (`Guide_ID`) REFERENCES `employee` (`Employee_ID`) ON DELETE SET NULL)
INSERT INTO Tour (Tour_Name, Tour_Date, Start_Time, End_Time, Max_Capacity, Guide_ID, Exhibition_ID, Language, Created_By, Created_At, Updated_By, Updated_At) VALUES
('Renaissance Masterpieces Tour', '2026-04-16', '10:00:00', '11:30:00', 20, 74, 1, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Spring Exhibition Highlights', '2026-04-17', '14:00:00', '15:30:00', 15, 78, 1, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Family Discovery Tour', '2026-04-18', '11:00:00', '12:00:00', 10, 84, 2, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Van Gogh & Friends', '2026-04-20', '13:00:00', '14:30:00', 20, 88, 2, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Summer Showcase Preview', '2026-06-12', '10:30:00', '12:00:00', 25, 104, 2, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Spanish Art Highlights', '2026-06-15', '15:00:00', '16:30:00', 15, 98, 2, 'Spanish', 'system', CURDATE(), 'system', CURDATE()),
('Behind the Scenes Conservation', '2026-07-05', '11:00:00', '12:30:00', 30, 88, 2, 'English', 'system', CURDATE(), 'system', CURDATE()),
('Sunday Morning Classics', '2026-04-23', '09:30:00', '11:00:00', 20, 94, 1, 'English', 'system', CURDATE(), 'system', CURDATE());

--@block
--error Cannot add or update a child row: a foreign key constraint fails (`museumdb`.`tour_registration`, CONSTRAINT `fk_tour_reg_tour` FOREIGN KEY (`Tour_ID`) REFERENCES `tour` (`Tour_ID`) ON DELETE CASCADE)
INSERT INTO Tour_Registration (Tour_ID, Membership_ID, Registration_Date, Created_By, Created_At) VALUES
(17, 2, '2026-04-01', 'system', CURDATE()),
(17, 3, '2026-04-02', 'system', CURDATE()),
(17, 4, '2026-04-03', 'system', CURDATE()),
(18, 5, '2026-04-05', 'system', CURDATE()),
(18, 6, '2026-04-06', 'system', CURDATE()),
(19, 2, '2026-04-08', 'system', CURDATE()),
(20, 3, '2026-04-10', 'system', CURDATE()),
(20, 4, '2026-04-11', 'system', CURDATE()),
(20, 5, '2026-04-12', 'system', CURDATE()),
(24, 6, '2026-05-15', 'system', CURDATE()),
(23, 2, '2026-05-20', 'system', CURDATE()),
(21, 3, '2026-06-01', 'system', CURDATE()),
(22, 4, '2026-04-15', 'system', CURDATE()),
(21, 5, '2026-04-16', 'system', CURDATE());