# Smart Task Manager - Server

This is the backend server for the Smart Task Management application built with Node.js, Express, and Prisma with PostgreSQL.

## Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Task Management**: Full CRUD operations for tasks with assignment capabilities
- **Admin Panel**: Administrative features for user and system management
- **Database**: PostgreSQL with Prisma ORM
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Audit Logging**: Track system activities and changes

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Database Setup

Make sure PostgreSQL is running and create a database named `taskmanagement`:

```sql
CREATE DATABASE taskmanagement;
```

### 3. Environment Configuration

The `.env` file is already configured with:

```env
DATABASE_URL="postgresql://postgres:Rahul@123@localhost:5432/taskmanagement?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"
```

**Important**: Change the `JWT_SECRET` in production!

### 4. Database Migration and Seeding

```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Seed the database with initial data
npm run db:seed
```

### 5. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## Default Accounts

After seeding, you'll have these default accounts:

### Admin Account
- **Email**: admin@taskmanager.com
- **Password**: admin123
- **Role**: ADMIN

### Demo User Account
- **Email**: demo@taskmanager.com
- **Password**: demo123
- **Role**: USER

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change password
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

### Tasks
- `GET /api/tasks` - Get tasks (filtered by user role)
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/stats/overview` - Get task statistics

### Admin
- `GET /api/admin/dashboard/stats` - Get dashboard statistics
- `GET /api/admin/settings` - Get admin settings
- `PUT /api/admin/settings` - Update admin settings
- `GET /api/admin/audit-logs` - Get audit logs
- `POST /api/admin/audit-logs` - Create audit log
- `GET /api/admin/system/health` - Get system health
- `POST /api/admin/users/bulk-action` - Bulk user operations
- `POST /api/admin/tasks/bulk-action` - Bulk task operations

## Database Schema

### Users Table
- User authentication and profile information
- Role-based access control (USER, ADMIN)
- Account status management

### Tasks Table
- Task management with status tracking
- Priority levels and due dates
- Assignment to users
- Creator and assignee relationships

### Admin Settings Table
- System-wide configuration
- Registration controls
- User limits

### Audit Logs Table
- Activity tracking
- Security monitoring
- Change history

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: Prevent abuse and DoS attacks
- **CORS**: Cross-origin request security
- **Helmet**: Security headers
- **Input Validation**: Express-validator for data validation
- **Role-based Access**: Admin and user role separation

## Development Tools

```bash
# View database in browser
npm run db:studio

# Reset database
npm run db:push --force-reset

# View logs
npm run dev
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Update `JWT_SECRET` with a secure random string
3. Configure production database URL
4. Set up SSL/TLS certificates
5. Configure reverse proxy (nginx)
6. Set up monitoring and logging

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists

### Migration Issues
```bash
npm run db:push --force-reset
npm run db:seed
```

### Port Conflicts
- Change `PORT` in `.env` file
- Check if port 5000 is available

## API Testing

You can test the API using tools like:
- Postman
- Insomnia
- curl
- Thunder Client (VS Code extension)

Example login request:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@taskmanager.com","password":"admin123"}'
```