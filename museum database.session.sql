--Below are tables with no foreign keys
--@Block,
CREATE TABLE Department (
    Department_ID INT AUTO_INCREMENT PRIMARY KEY,
    Department_Name VARCHAR(30) NOT NULL,
    Manager_ID INT NULL,
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30),
    Updated_AT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

--@Block
CREATE TABLE Artist(
    Artist_ID INT AUTO_INCREMENT PRIMARY KEY,
    Artist_Name VARCHAR(30) NOT NULL,
    Date_of_Birth DATE,
    Date_of_Death DATE NULL,
    Birth_Place VARCHAR(30)
);

--@Block
CREATE TABLE Exhibition(
    Exhibition_ID INT AUTO_INCREMENT PRIMARY KEY,
    Exhibition_Name VARCHAR(50) NOT NULL,
    Starting_Date DATE NOT NULL,
    Ending_Date DATE NOT NULL,
    CHECK (Ending_Date >= Starting_Date)
);

--@Block
CREATE TABLE Gift_Shop_Item(
    Gift_Shop_Item_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name_of_Item VARCHAR(30) NOT NULL,
    Price_of_Item DECIMAL(10,2) NOT NULL,
    Category VARCHAR(30),
    Stock_Quantity INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30),
    Updated_AT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (Stock_Quantity >= 0),
    CHECK (Price_of_Item >= 0)
);

--@Block
CREATE TABLE Food(
    Food_ID INT AUTO_INCREMENT PRIMARY KEY,
    Food_Name VARCHAR(30) NOT NULL,
    Food_Price DECIMAL(4,2) NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30),
    Updated_AT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (Food_Price >= 0)
);

--@Block
CREATE TABLE Membership(
    Membership_ID INT AUTO_INCREMENT PRIMARY KEY,
    Last_Name VARCHAR(30) NOT NULL,
    First_Name VARCHAR(30) NOT NULL,
    Phone_Number VARCHAR(10),
    Email VARCHAR(50),
    Date_Joined DATE NOT NULL,
    Date_Exited DATE NULL,
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30),
    Updated_AT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (Date_Exited IS NULL OR Date_Exited >= Date_Joined)
);

-- Below are tables with foreign keys
--@block

CREATE TABLE Employee (
    Employee_ID INT AUTO_INCREMENT PRIMARY KEY,
    Last_Name VARCHAR(30) NOT NULL,
    First_Name VARCHAR(30) NOT NULL,
    Date_Hired DATE NOT NULL,
    Email VARCHAR(50),
    Employee_Address VARCHAR(50),
    Date_of_Birth DATE,
    Hourly_Pay DECIMAL (6,2),
    Salary DECIMAL(10, 2),
    Employee_Role VARCHAR(20),
    Supervisor_ID INT NULL, 
    Department_ID INT NULL,
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30),
    Updated_AT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CHECK ((Hourly_Pay IS NOT NULL AND Hourly_Pay > 0 AND Salary IS NULL)
    OR (Salary IS NOT NULL AND Salary > 0 AND Hourly_Pay IS NULL)),

    CONSTRAINT fk_Employee_Supervisor
    FOREIGN KEY (Supervisor_ID) REFERENCES Employee(Employee_ID)
    ON DELETE SET NULL,

    CONSTRAINT fk_Employee_Department
    FOREIGN KEY (Department_ID) REFERENCES Department(Department_ID)
    ON DELETE SET NULL
);

-- @Block
CREATE TABLE ARTWORK(
    Artwork_ID INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(30) NOT NULL,
    Type VARCHAR(30) NOT NULL,
    Date_Created DATE,
    Time_Period VARCHAR(30),
    Art_Style VARCHAR(30),
    Artist_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30),
    Updated_AT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_Artwork_Artist
    FOREIGN KEY (Artist_ID) REFERENCES Artist(Artist_ID)
    ON DELETE CASCADE
);

-- @Block
CREATE TABLE Exhibition_Artwork(
    Exhibition_Artwork_ID INT AUTO_INCREMENT PRIMARY KEY,
    Display_Room VARCHAR(30),
    Date_Installed DATE,
    Exhibition_ID INT NOT NULL,
    Artwork_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30),
    Updated_AT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE(exhibition_ID, Artwork_ID),

    CONSTRAINT fk_Exhibition_Artwork_Exhibition
    FOREIGN KEY (Exhibition_ID) REFERENCES Exhibition(Exhibition_ID)
    ON DELETE CASCADE,
    
    CONSTRAINT fk_Exhibition_Artwork_Artwork
    FOREIGN KEY (Artwork_ID) REFERENCES Artwork(Artwork_ID)
    ON DELETE CASCADE
);

-- @Block
CREATE TABLE Ticket(
    Ticket_ID INT AUTO_INCREMENT PRIMARY KEY,
    Purchase_type VARCHAR(30),
    Purchase_Date DATE NOT NULL,
    Visit_Date DATE NOT NULL,
    Last_Name VARCHAR(30),
    First_Name VARCHAR(30),
    Phone_number VARCHAR(10),
    Email VARCHAR(50),
    Payment_method VARCHAR(30),
    Membership_ID INT NULL,
    Created_by VARCHAR(30),
    Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_by VARCHAR(30),
    Updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CHECK (Visit_Date >= Purchase_Date),
    
    CONSTRAINT fk_ticket_Membership
    FOREIGN KEY (Membership_ID) REFERENCES Membership(Membership_ID)
    ON DELETE SET NULL
);

-- @Block
CREATE TABLE ticket_line(
    Ticket_line_ID INT AUTO_INCREMENT PRIMARY KEY,
    Ticket_Type VARCHAR(30),
    Quantity INT NOT NULL CHECK (Quantity > 0),
    Price_per_ticket DECIMAL(6,2) NOT NULL CHECK (price_per_ticket >= 0),
    Ticket_ID INT NOT NULL,
    Total_sum_of_ticket DECIMAL(10,2) GENERATED ALWAYS AS (Quantity * price_per_ticket) STORED,
    Exhibition_ID INT NULL,
    Created_by VARCHAR(30),
    Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_by VARCHAR(30),
    Updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_ticket_line_ticket
    FOREIGN KEY (ticket_ID) REFERENCES ticket(ticket_ID)
    ON DELETE CASCADE,
    
    CONSTRAINT fk_ticket_line_exhibition
    FOREIGN KEY (exhibition_ID) REFERENCES exhibition(exhibition_ID)
    ON DELETE SET NULL
);

-- @Block
CREATE TABLE Event (
    event_ID INT AUTO_INCREMENT PRIMARY KEY,
    event_Name VARCHAR(30) NOT NULL,
    start_Date DATE NOT NULL,
    end_Date DATE NOT NULL,
    member_only BOOLEAN,
    coordinator_ID INT NULL,
    created_by VARCHAR(30),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,    
    updated_by VARCHAR(30),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    Max_capacity INT NOT NULL,
    
    CONSTRAINT chk_capacity CHECK (Max_capacity>0),
    CHECK (end_Date >= start_Date),

    CONSTRAINT fk_Event_Coordinator
    FOREIGN KEY(coordinator_ID) REFERENCES Employee(Employee_ID)
    ON DELETE SET NULL
);

-- @Block
CREATE TABLE event_registration(
    Event_Registration_ID INT AUTO_INCREMENT PRIMARY KEY,
    Registration_Date DATE NOT NULL,
    Event_ID INT NOT NULL,
    Membership_ID INT NOT NULL,
    Ticket_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30),
    Updated_At DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE (Event_ID, Membership_ID),
    
    CONSTRAINT fk_Reg_Event
    FOREIGN KEY (Event_ID) REFERENCES Event(Event_ID)
    ON DELETE CASCADE,
    
    CONSTRAINT fk_Reg_Membership
    FOREIGN KEY (Membership_ID) REFERENCES Membership(Membership_ID)
    ON DELETE CASCADE,
    
    CONSTRAINT fk_Reg_Ticket
    FOREIGN KEY (Ticket_ID) REFERENCES Ticket(Ticket_ID)
    ON DELETE CASCADE
);

--@Block

CREATE TABLE Schedule(
    Schedule_ID INT AUTO_INCREMENT PRIMARY KEY,
    Shift_Date DATE NOT NULL,
    Start_Time TIME NOT NULL,
    End_Time TIME NOT NULL,
    Employee_ID INT NOT NULL,
    Exhibition_ID INT NOT NULL,
    Duty VARCHAR(20),
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30),
    Updated_At DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CHECK (End_Time > Start_Time),

    CONSTRAINT fk_Schedule_Employee
    FOREIGN KEY (Employee_ID) REFERENCES Employee(Employee_ID)
    ON DELETE CASCADE,

    CONSTRAINT fk_Schedule_Exhibition
    FOREIGN KEY (Exhibition_ID) REFERENCES Exhibition(Exhibition_ID)
    ON DELETE CASCADE
);

--@block
CREATE TABLE Gift_Shop_Sale (
    Gift_Shop_Sale_ID INT AUTO_INCREMENT PRIMARY KEY,
    Sale_Date DATE NOT NULL,
    Employee_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30),
    Updated_At DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_Gift_Shop_Sale_EMPLOYEE
    FOREIGN KEY (Employee_ID) REFERENCES Employee (Employee_ID)
    ON DELETE RESTRICT
);

--@block
CREATE TABLE Gift_Shop_Sale_Line (
    Gift_Shop_Sale_Line_ID INT AUTO_INCREMENT PRIMARY KEY,
    Price_When_Item_is_Sold DECIMAL(10, 2) NOT NULL,
    Quantity INT NOT NULL,
    Total_Sum_For_Gift_Shop_Sale DECIMAL(10, 2) GENERATED ALWAYS AS (Quantity * Price_When_Item_is_Sold) STORED,
    Gift_Shop_Sale_ID INT NOT NULL,
    Gift_Shop_Item_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30) NULL,
    Updated_At DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_Gift_Shop_Sale_Line_Sale
    FOREIGN KEY (Gift_Shop_Sale_ID) REFERENCES Gift_Shop_Sale (Gift_Shop_Sale_ID)
    ON DELETE CASCADE,

    CONSTRAINT fk_Gift_Shop_Sale_Line_Item 
    FOREIGN KEY (Gift_Shop_Item_ID) REFERENCES Gift_Shop_Item (Gift_Shop_Item_ID) 
    ON DELETE RESTRICT,

    CHECK (Quantity > 0),
    CHECK (Price_When_Item_is_Sold >= 0)
);

--@block
CREATE TABLE Food_Sale(
    Food_Sale_ID INT AUTO_INCREMENT PRIMARY KEY,
    Sale_Date DATE NOT NULL,
    Employee_ID INT NOT NULL,
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30),
    Updated_At DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_Food_sale_Employee
    FOREIGN KEY (Employee_ID) REFERENCES Employee(Employee_ID)
    ON DELETE RESTRICT
);

--@block
CREATE TABLE Food_Sale_Line (
    Food_Sale_Line_ID INT AUTO_INCREMENT PRIMARY KEY,
    Price_When_Food_Was_Sold DECIMAL(10, 2) NOT NULL,
    Quantity INT NOT NULL,
    Food_Sale_ID INT NOT NULL,
    Food_ID INT NOT NULL,
    Total_sum_for_food_sale DECIMAL (10,2) GENERATED ALWAYS AS (Quantity * Price_When_Food_Was_Sold) STORED,
    Created_By VARCHAR(30),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_By VARCHAR(30),
    Updated_At DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (Quantity > 0),
    CHECK (Price_When_Food_Was_Sold >= 0),
    CONSTRAINT fk_Food_Sale_Line_Sale
    FOREIGN KEY (Food_Sale_ID) References Food_Sale (Food_Sale_ID)
    ON DELETE CASCADE,

    CONSTRAINT fk_Food_Sale_Line_Food
    FOREIGN KEY (Food_ID) REFERENCES Food (Food_ID)
    ON DELETE RESTRICT
);
--@Block, this is for circular foreign keys after tables have been made

ALTER TABLE Department
ADD CONSTRAINT fk_Employee_Manager
FOREIGN KEY (Manager_ID) REFERENCES Employee(Employee_ID)
ON DELETE SET NULL;

