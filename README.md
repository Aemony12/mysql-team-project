# Museum Database Web Application SetUp

This project is a museum operations database application for COSC 3380. It includes a populated MySQL database and a web application for managing museum records, member services, staff operations, inventory, sales, events, tours, and reports.

The application is organized around different museum roles. Each role sees a dashboard with the actions and reports that apply to that type of user.

## Project Contents

| Path | Description |
| --- | --- |
| `sqlFiles/` | Database schema, user table setup, seeded login accounts, triggers, stored procedures, views, and membership status logic. |
| `insert_sql_files/` | Sample data used to populate the database. |
| `setup_full_database(RUN THIS ).bat` | Windows script for rebuilding the complete database. |
| `setup_full_database.sh` | macOS/Linux/Git Bash script for rebuilding the complete database. |
| `webapp/` | Web application source code. |
| `webapp/.env.example` | Example database configuration file. |

## Hosted Website

The primary version of the project is hosted on Microsoft Azure. The Azure website link and login credentials are provided separately in the submission email.

The instructions below are for running the same project locally from the submitted source code.

## Local Requirements and Tech Stack

- MySQL 8.0 or compatible MySQL server
- Node.js 18 or newer
- npm
- Built with React

## Local Database Setup

The setup scripts drop the existing `museumdb` database, rebuild the schema, load the sample data, create triggers and reports, and insert the test login accounts.

On Windows:

```bat
setup_full_database(RUN THIS ).bat
```

On macOS, Linux, or Git Bash:

```bash
chmod +x setup_full_database.sh
./setup_full_database.sh
```

The scripts will ask for the MySQL host,, port, username, password, and database name. The expected database name for the web app is:

```text
museumdb
```
A visual example of how to set up inside the batch file:

```text
=========================================
  Museum DB - FULL System Setup
=========================================

This drops and fully rebuilds museumdb from scratch.
(All schema files + all insert files will be run)

Where do you want to connect?
  [1] Local
  [2] Hosted

Enter 1 or 2: 1
Enter MySQL host: localhost
Enter MySQL port: 3306
Enter MySQL username: your_username_here(usually default as 'root')
Enter MySQL password: your_password_here
Enter database name: museumdb

Connecting to: localhost:3306 as root on database museumdb
```


If the Windows script cannot find MySQL, update the `MYSQL` path inside `setup_full_database(RUN THIS ).bat` to match the local MySQL installation.

## Local Web Application Setup

From the project root:

```bash
cd webapp
npm install
```

Create the environment file:

```bash
copy .env.example .env
```

For macOS/Linux:

```bash
cp .env.example .env
```

Edit `webapp/.env` with the MySQL connection values:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=museumdb
DB_USER=root
DB_PASSWORD=your_password_here
DB_SSL=false
SESSION_SECRET=replace_me
```

Start the web app:

```bash
npm start
```

Open the application at:

```text
http://localhost:3000
```


