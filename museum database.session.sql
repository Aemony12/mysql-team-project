--Food for thought, do foreign keys once all tables have been made

CREATE TABLE Employee (
    Employee_ID INT PRIMARY KEY,
    Last_Name VARCHAR(30),
    First_Name VARCHAR(30),
    Date_Hired DATE,
    Email VARCHAR(50),
    Employee_Address VARCHAR(50),
    Date_of_Birth (DATE),
    Salary DECIMAL(4,2),
    Employee_Role VARCHAR(20),
    --Employee_ID INT,FOREIGN KEY (Employee_ID) REFERENCES Employee(Employee_ID);
    


);
