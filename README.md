# Library Management System

A full-stack web application for managing library operations including books, members, and book transactions (issue/return). Built with HTML, CSS, JavaScript on the frontend and Node.js, Express, and MySQL on the backend.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Screenshots](#screenshots)
- [Usage Guide](#usage-guide)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- **Dashboard** — Overview of library statistics (total books, members, issued books, overdue count)
- **Books Management** — Add, edit, delete, and search books with ISBN tracking
- **Members Management** — Add, edit, delete, and search library members
- **Issue Books** — Issue available books to active members with custom due dates
- **Return Books** — Return issued books with automatic overdue fine calculation ($1/day)
- **Transaction History** — Complete log of all issue/return transactions with fine details
- **Responsive Design** — Works on desktops, tablets, and mobile devices
- **Real-time Search** — Debounced search across books and members
- **Toast Notifications** — User-friendly success/error feedback

---

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | HTML5, CSS3, Vanilla JavaScript     |
| Backend  | Node.js, Express.js                 |
| Database | MySQL (via XAMPP)                   |
| Icons    | Font Awesome 6                      |
| ORM      | mysql2 (promise-based driver)       |

---

## Project Structure

```
Library-Management-System/
├── config/
│   └── db.js                  # MySQL connection pool configuration
├── database/
│   └── schema.sql             # Database schema and sample data
├── public/
│   ├── css/
│   │   └── style.css          # Application styles
│   ├── js/
│   │   └── app.js             # Frontend logic (API calls, DOM manipulation)
│   └── index.html             # Single-page application HTML
├── routes/
│   ├── books.js               # Book CRUD API routes
│   ├── members.js             # Member CRUD API routes
│   └── transactions.js        # Issue/return and dashboard stats routes
├── .env                       # Environment variables (DB credentials)
├── .gitignore                 # Git ignore rules
├── package.json               # Project metadata and dependencies
├── server.js                  # Express server entry point
└── README.md                  # Project documentation
```

---

## Prerequisites

Before setting up the project, make sure you have the following installed:

1. **[Node.js](https://nodejs.org/)** (v16 or higher)
2. **[XAMPP](https://www.apachefriends.org/)** (for MySQL and phpMyAdmin)

To verify Node.js is installed:

```bash
node --version
npm --version
```

---

## Installation

1. **Clone the repository** (or download the source code):

   ```bash
   git clone https://github.com/your-username/Library-Management-System.git
   cd Library-Management-System
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

   This installs the following packages:

   | Package  | Purpose                            |
   | -------- | ---------------------------------- |
   | express  | Web server framework               |
   | mysql2   | MySQL database driver (with promises) |
   | cors     | Cross-origin resource sharing      |
   | dotenv   | Environment variable management    |
   | nodemon  | Auto-restart server on file changes (dev) |

---

## Database Setup

1. **Start XAMPP** and ensure both **Apache** and **MySQL** modules are running.

2. **Open phpMyAdmin** in your browser:

   ```
   http://localhost/phpmyadmin
   ```

3. **Create the database and tables:**

   - Click on the **SQL** tab in phpMyAdmin.
   - Copy and paste the contents of `database/schema.sql` into the SQL editor.
   - Click **Go** to execute the script.

   This will:
   - Create a database named `library_db`
   - Create three tables: `books`, `members`, `transactions`
   - Insert sample data (5 books and 3 members)

### Database Schema

#### `books` Table

| Column           | Type         | Description                |
| ---------------- | ------------ | -------------------------- |
| id               | INT (PK)     | Auto-increment primary key |
| title            | VARCHAR(255) | Book title                 |
| author           | VARCHAR(255) | Book author                |
| isbn             | VARCHAR(20)  | Unique ISBN number         |
| publisher        | VARCHAR(255) | Publisher name             |
| year_published   | YEAR         | Publication year           |
| genre            | VARCHAR(100) | Book genre/category        |
| total_copies     | INT          | Total copies owned         |
| available_copies | INT          | Currently available copies |
| created_at       | TIMESTAMP    | Record creation time       |
| updated_at       | TIMESTAMP    | Last update time           |

#### `members` Table

| Column          | Type         | Description                     |
| --------------- | ------------ | ------------------------------- |
| id              | INT (PK)     | Auto-increment primary key      |
| name            | VARCHAR(255) | Member full name                |
| email           | VARCHAR(255) | Unique email address            |
| phone           | VARCHAR(20)  | Contact number                  |
| address         | TEXT         | Home address                    |
| membership_date | DATE         | Date of registration            |
| status          | ENUM         | `active` or `inactive`          |
| created_at      | TIMESTAMP    | Record creation time            |
| updated_at      | TIMESTAMP    | Last update time                |

#### `transactions` Table

| Column      | Type         | Description                              |
| ----------- | ------------ | ---------------------------------------- |
| id          | INT (PK)     | Auto-increment primary key               |
| book_id     | INT (FK)     | Reference to books table                 |
| member_id   | INT (FK)     | Reference to members table               |
| issue_date  | DATE         | Date the book was issued                 |
| due_date    | DATE         | Expected return date                     |
| return_date | DATE         | Actual return date (null if not returned) |
| status      | ENUM         | `issued`, `returned`, or `overdue`       |
| fine        | DECIMAL      | Fine amount for overdue returns          |
| created_at  | TIMESTAMP    | Record creation time                     |
| updated_at  | TIMESTAMP    | Last update time                         |

---

## Configuration

Edit the `.env` file in the project root to match your XAMPP MySQL settings:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=library_db
PORT=3000
```

> **Note:** XAMPP's default MySQL user is `root` with an empty password. If you've set a custom password, update `DB_PASSWORD` accordingly.

---

## Running the Application

### Development Mode (auto-restart on changes)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

Once running, open your browser and navigate to:

```
http://localhost:3000
```

---

## API Endpoints

### Books

| Method | Endpoint              | Description           |
| ------ | --------------------- | --------------------- |
| GET    | `/api/books`          | Get all books         |
| GET    | `/api/books/search?q=`| Search books          |
| GET    | `/api/books/:id`      | Get a single book     |
| POST   | `/api/books`          | Add a new book        |
| PUT    | `/api/books/:id`      | Update a book         |
| DELETE | `/api/books/:id`      | Delete a book         |

#### Add/Update Book — Request Body

```json
{
  "title": "Book Title",
  "author": "Author Name",
  "isbn": "978-0000000000",
  "publisher": "Publisher Name",
  "year_published": 2024,
  "genre": "Fiction",
  "total_copies": 3
}
```

### Members

| Method | Endpoint                | Description           |
| ------ | ----------------------- | --------------------- |
| GET    | `/api/members`          | Get all members       |
| GET    | `/api/members/search?q=`| Search members        |
| GET    | `/api/members/:id`      | Get a single member   |
| POST   | `/api/members`          | Add a new member      |
| PUT    | `/api/members/:id`      | Update a member       |
| DELETE | `/api/members/:id`      | Delete a member       |

#### Add/Update Member — Request Body

```json
{
  "name": "Member Name",
  "email": "member@example.com",
  "phone": "555-0100",
  "address": "123 Street Name",
  "status": "active"
}
```

### Transactions

| Method | Endpoint                          | Description                    |
| ------ | --------------------------------- | ------------------------------ |
| GET    | `/api/transactions`               | Get all transactions           |
| GET    | `/api/transactions/active`        | Get active (issued) books      |
| GET    | `/api/transactions/overdue`       | Get overdue transactions       |
| GET    | `/api/transactions/stats/dashboard` | Get dashboard statistics     |
| POST   | `/api/transactions/issue`         | Issue a book to a member       |
| POST   | `/api/transactions/return/:id`    | Return an issued book          |

#### Issue Book — Request Body

```json
{
  "book_id": 1,
  "member_id": 1,
  "due_date": "2026-03-07"
}
```

#### Dashboard Stats — Response

```json
{
  "totalBooks": 5,
  "totalMembers": 3,
  "issuedBooks": 2,
  "overdueBooks": 0,
  "totalCopies": 17,
  "availableCopies": 15
}
```

---

## Usage Guide

### Managing Books

1. Navigate to **Books** from the sidebar.
2. Click **Add Book** to open the form and fill in the details (Title, Author, and ISBN are required).
3. Use the **search bar** to find books by title, author, ISBN, or genre.
4. Click the **edit** (pencil) icon to modify a book's details.
5. Click the **delete** (trash) icon to remove a book.

### Managing Members

1. Navigate to **Members** from the sidebar.
2. Click **Add Member** to register a new member (Name and Email are required).
3. Use the **search bar** to find members by name, email, or phone.
4. Edit or delete members using the action buttons.

### Issuing a Book

1. Navigate to **Issue Book** from the sidebar.
2. Select an available book from the dropdown.
3. Select an active member.
4. Set the due date (defaults to 14 days from today).
5. Click **Issue Book**.

### Returning a Book

1. Navigate to **Returns** from the sidebar.
2. View all currently issued books with their due dates.
3. Click the **Return** button next to the book.
4. If the book is overdue, a fine of **$1.00 per day** is automatically calculated.

### Viewing Transaction History

1. Navigate to **History** from the sidebar.
2. View all past and current transactions including issue dates, return dates, fines, and status.

---

## Troubleshooting

| Problem                              | Solution                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `ECONNREFUSED` error on startup      | Make sure MySQL is running in XAMPP Control Panel                                          |
| `ER_ACCESS_DENIED_ERROR`             | Check your `DB_USER` and `DB_PASSWORD` in `.env`                                          |
| `ER_BAD_DB_ERROR`                    | Run `database/schema.sql` in phpMyAdmin to create the `library_db` database                |
| Port 3000 already in use             | Change `PORT` in `.env` to another value (e.g., `3001`) or stop the process using port 3000 |
| XAMPP MySQL won't start              | Check if another MySQL instance is running on port 3306; stop it or change XAMPP's port     |
| Page loads but no data appears       | Open browser DevTools (F12) → Console to check for API errors                              |
| `ER_DUP_ENTRY` when adding book      | A book with the same ISBN already exists; use a unique ISBN                                 |

---

## License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).
