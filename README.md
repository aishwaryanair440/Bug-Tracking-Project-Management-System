# Bug-Tracking-Project-Management-System

A web-based system for managing academic software projects, teams, tasks, and bug reports. It provides role-based access for faculty and students, enabling efficient task tracking, bug reporting, and collaboration. Built using React, TypeScript, Node.js, Express.js, and MySQL.

## Project Structure

```text
├── backend/                  # Node.js + Express API backend & database scripts
│   ├── routes/               # API route handlers
│   ├── sql/                  # SQL schema, migrations, and triggers
│   ├── server.js             # Express server entry point
│   ├── database.js           # MySQL connection pool
│   └── .env.example          # Sample environment configuration
├── frontend/                 # React + TypeScript + Vite frontend
│   ├── src/                  # Components, portals, and UI screens
│   ├── package.json          # Frontend dependencies
│   └── .env.example          # Sample frontend configuration
├── start-all.bat             # Batch script to launch MySQL, backend, and frontend
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- MySQL Server (v8.0+)
- npm or pnpm

### 1. Database Setup
1. Ensure your MySQL server is running.
2. Run the database setup script located at `backend/sql/bug_tracking_system.sql` to initialize the database and tables.
3. (Optional) Run any additional SQL triggers or migrations in `backend/sql/`.

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` file by copying the example:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with your MySQL connection credentials:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=bug_tracking_system
   ```
5. Start the backend:
   ```bash
   npm start
   ```
   The backend API will be available at `http://localhost:5000`.

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The application UI will be accessible at the Vite dev server URL (e.g. `http://localhost:5173` or `http://localhost:8443`).

---

### Windows Quick Start
You can launch all services simultaneously on Windows by running:
```cmd
start-all.bat
```
*(Make sure MySQL paths in the batch script match your local setup).*
