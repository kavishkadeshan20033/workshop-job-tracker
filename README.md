# Workshop Job Tracker

A full-stack web application for managing workshop/repair jobs. Built with Node.js, Express, MySQL, and React.

## Features

- **User Authentication** — Register/Login with bcrypt password hashing and JWT tokens
- **Role-Based Access** — Admin and Technician roles with different permissions
- **Customer Management** — CRUD operations for workshop clients
- **Vehicle Tracking** — Link vehicles to customers with detailed records
- **Job/Work Order Management** — Create, assign, track, and complete repair jobs
- **Parts Inventory** — Manage spare parts stock with low-stock alerts
- **Invoicing** — Auto-calculated invoices from job tasks and parts
- **Reports** — Daily and monthly reports exportable as CSV or PDF
- **API Documentation** — Swagger/OpenAPI docs at `/api-docs`
- **Logging** — Winston-based action and error logging to file

## Tech Stack

| Layer | Technology |
|---|---|
| Database | MySQL |
| Backend | Node.js + Express.js |
| Frontend | React (Vite) |
| Auth | bcryptjs + JWT |
| API Docs | Swagger UI |
| Logging | Winston |
| Reports | jsPDF + PapaParse |

## Prerequisites

- **Node.js** v18+ installed
- **npm** (comes with Node.js)
- **MySQL** server running locally or remotely

## Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd workshopjob
```

### 2. Database Setup
1. Create a new MySQL database.
2. Import the schema file located at `server/database/mysql_schema.sql` into your database to create the required tables.

### 3. Start the Backend
```bash
cd server
cp .env.example .env    # Create environment file and update DB credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
npm install             # Install dependencies
npm start               # Start server on http://localhost:3000
```

The database will be automatically seeded with default admin and parts on first run.

### 4. Start the Frontend
```bash
cd client
npm install             # Install dependencies
npm run dev             # Start dev server on http://localhost:5173
```

### 5. Open the App
Navigate to **http://localhost:5173** in your browser.

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

**Default Technician Credentials:**
- Username: `tech1`
- Password: `tech123`

## API Documentation

Once the server is running, visit: **http://localhost:3000/api-docs**

## API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login | Public |
| GET | `/api/auth/profile` | Get profile | Auth |
| GET | `/api/auth/users` | List all users | Admin |
| GET/POST/PUT/DELETE | `/api/customers` | Customer CRUD | Auth |
| GET/POST/PUT/DELETE | `/api/vehicles` | Vehicle CRUD | Auth |
| GET/POST/PUT/DELETE | `/api/jobs` | Job CRUD | Auth |
| PATCH | `/api/jobs/:id/status` | Update job status | Auth |
| POST/PUT/DELETE | `/api/jobs/:id/tasks` | Job tasks | Auth |
| POST/DELETE | `/api/jobs/:id/parts` | Job parts | Auth |
| GET/POST/PUT/DELETE | `/api/parts` | Parts CRUD | Admin |
| GET/POST/PUT/DELETE | `/api/invoices` | Invoice CRUD | Admin |
| GET | `/api/reports/daily` | Daily report | Auth |
| GET | `/api/reports/monthly` | Monthly report | Auth |

## Database Schema

The database contains 9 tables:
- `users` — Authentication and roles
- `customers` — Workshop clients
- `vehicles` — Customer vehicles
- `jobs` — Work orders
- `job_tasks` — Tasks within a job
- `parts` — Parts inventory
- `job_parts` — Parts used per job
- `invoices` — Billing records
- `audit_log` — Action audit trail

See `server/database/schema.sql` for the complete DDL.

## Project Structure

```
workshopjob/
├── server/                     # Express.js Backend
│   ├── database/
│   │   └── schema.sql          # Database DDL
│   ├── src/
│   │   ├── config/             # DB & Swagger config
│   │   ├── middleware/         # Auth, logger, error handler
│   │   ├── models/             # Database models
│   │   ├── controllers/        # Request handlers
│   │   ├── routes/             # API routes with Swagger docs
│   │   ├── utils/              # JWT & password helpers
│   │   └── index.js            # Server entry point
│   ├── .env.example
│   └── package.json
├── client/                     # React SPA (Vite)
│   ├── src/
│   │   ├── components/         # Shared UI components
│   │   ├── context/            # Auth context
│   │   ├── pages/              # Route pages
│   │   ├── services/           # API client
│   │   ├── App.jsx             # Router
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Design system
│   └── package.json
├── .gitignore
└── README.md
```

## Security Features

- Passwords hashed with bcryptjs (10 salt rounds)
- JWT-based authentication with configurable expiry
- Role-based authorization middleware
- Input validation with express-validator
- Parameterized SQL queries (prevents SQL injection)
- Helmet.js security headers
- CORS configuration

## Logging

Server actions and errors are logged via Winston to:
- `server/logs/combined.log` — All logs
- `server/logs/error.log` — Error logs only
- Console output in development mode

## License

ISC
