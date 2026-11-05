# Team & Bug Tracking Backend

Simple Node.js + Express + MySQL backend for the existing Team & Bug Tracking / Project Management database.

## Important

This backend **does not create, alter, or drop your database tables**.

It connects to the existing database schema:

- FACULTY
- PROJECT
- TEAM
- STUDENT
- TASK
- BUG_REPORT
- COMMENTS

The complete SQL operation file is included as:

`existing_database_sql_operations.sql`

The backend also loads those operations into `sqlOperations.js` and uses the shared MySQL connection in `database.js`.

## Folder structure

```text
team_bug_backend/
├── server.js
├── database.js
├── sqlOperations.js
├── existing_database_sql_operations.sql
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 1. Install

```bash
npm install
```

## 2. Create `.env`

Copy `.env.example` to `.env` and fill in your MySQL details:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name
DB_CONNECTION_LIMIT=10
```

## 3. Start

```bash
npm start
```

For development:

```bash
npm run dev
```

## 4. Test the backend

Open:

`http://localhost:5000/`

Database health:

`http://localhost:5000/api/health`

SQL operation catalog:

`http://localhost:5000/api/database/operations`

The operation catalog should show the SQL operation IDs loaded from the existing SQL file.

## Current API routes

### Authentication

`POST /api/login`

Body:

```json
{
  "email": "student@example.com",
  "password": "password",
  "role": "student"
}
```

Role can be `student` or `faculty`.

### Student

- `GET /api/students/:id`
- `PUT /api/students/:id`
- `GET /api/students/:id/projects`
- `GET /api/students/:id/tasks`
- `GET /api/students/:id/dashboard`
- `PUT /api/students/:id/team`

### Faculty

- `GET /api/faculty/:id`
- `GET /api/faculty/:id/dashboard`

### Projects

- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `PUT /api/projects/:id/status`
- `GET /api/projects/:id/team`
- `GET /api/projects/:id/tasks`
- `GET /api/projects/:id/bugs`

### Teams

- `POST /api/teams`

### Tasks

- `POST /api/tasks`
- `PUT /api/tasks/:id/status`

### Bugs

- `GET /api/bugs/:id`
- `POST /api/bugs`
- `PUT /api/bugs/:id/status`
- `GET /api/bugs/:id/comments`
- `POST /api/bugs/:id/comments`

## Database connection flow

```text
Frontend
   ↓ HTTP request
server.js
   ↓
SQL operation / parameterized query
   ↓
database.js
   ↓
MySQL connection pool
   ↓
Existing database
```

## Important schema limitations

The backend intentionally does not invent columns that are absent from the current database. The existing SQL file documents these gaps, including:

- Faculty Phone Number
- Project Tagline / Subtitle
- Project Priority
- Team Role
- Task Due Date
- Bug Description
- Bug Priority
- Generic Bug Reported_By

You said you will provide the table-attribute and seed-data files later. Once those are provided, the schema/data can be checked against this backend before we connect the frontend.

## Security note

The current database has a `Password` column, so the demo login follows the current schema. For a production application, passwords should be stored as secure hashes and verified by the backend.
