# Admin Functionality Documentation

This document outlines the admin functionality available in the Smart Task Manager application.

## Admin Capabilities

### User Management
- **View all users**: Get a list of all users with filtering and pagination
- **Create new user accounts**: Create new user accounts with specified roles
- **Deactivate user accounts**: Temporarily disable user access
- **Activate user accounts**: Re-enable previously deactivated accounts
- **Delete user accounts**: Permanently remove user accounts
- **Bulk operations**: Perform actions on multiple users at once

### Dashboard & Analytics
- **View system statistics**: Total users, tasks, and their statuses
- **User activity metrics**: Active vs. inactive users
- **Task status overview**: Tasks by status (pending, in progress, completed, cancelled)
- **Task priority distribution**: Tasks by priority level
- **Top task creators**: Users who have created the most tasks
- **User-task summary**: Detailed breakdown of tasks by user and status
- **Recent activity**: Latest users and tasks
- **AI-generated reports**: Critical and overdue tasks analysis with recommendations

### Task Management
- **View all tasks**: See all tasks in the system with advanced filtering
- **View tasks by user**: Filter tasks created by specific users
- **Task status management**: Update task statuses in bulk
- **Task deletion**: Remove tasks from the system

### System Administration
- **System health monitoring**: Check database and server status
- **Audit logs**: Track important system events and user actions
- **System settings**: Configure application-wide settings

## API Endpoints

### User Management
- `GET /api/admin/users` - Get all users with filtering and pagination
- `POST /api/admin/users` - Create a new user
- `PUT /api/admin/users/:userId/status` - Activate or deactivate a user account
- `POST /api/admin/users/bulk-action` - Perform bulk operations on users (activate, deactivate, delete)

### Dashboard & Analytics
- `GET /api/admin/dashboard/stats` - Get comprehensive dashboard statistics
- `GET /api/admin/dashboard/user-task-summary` - Get detailed task breakdown by user
- `GET /api/admin/reports/critical-tasks` - Get AI-generated report on critical and overdue tasks

### Task Management
- `GET /api/admin/tasks` - Get all tasks with advanced filtering
- `GET /api/admin/users/:userId/tasks` - Get tasks for a specific user
- `POST /api/admin/tasks/bulk-action` - Perform bulk operations on tasks (complete, cancel, delete)

### System Administration
- `GET /api/admin/settings` - Get system settings
- `PUT /api/admin/settings` - Update system settings
- `GET /api/admin/audit-logs` - Get audit logs
- `POST /api/admin/audit-logs` - Create an audit log entry
- `GET /api/admin/system/health` - Check system health

## Security

All admin routes are protected by:
1. Authentication middleware (`authenticateToken`)
2. Active user check middleware (`requireActiveUser`)
3. Admin role verification middleware (`requireAdmin`)

This ensures that only authenticated, active users with admin privileges can access these endpoints.

## AI-Powered Features

The Smart Task Manager includes several AI-powered features to enhance productivity:

### For Users
- **Category Prediction**: The system predicts which category a user is likely to use next based on their task history
  - Endpoint: `GET /api/tasks/predict/next-category`
  
- **Description Generation**: Users can generate detailed task descriptions from brief summaries
  - Endpoint: `POST /api/tasks/generate-description`
  - Required fields: `title` and `summary`

### For Admins
- **Critical Tasks Reports**: AI-generated analysis of critical and overdue tasks with recommendations
  - Endpoint: `GET /api/admin/reports/critical-tasks`
  - Provides executive summary, statistics, and actionable insights

These AI features are powered by Google's Gemini API and help both users and administrators be more productive and make better decisions.