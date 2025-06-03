# AI-Powered Features in Smart Task Manager

This document outlines the AI-powered features available in the Smart Task Manager application.

## Overview

The Smart Task Manager incorporates several AI-powered features to enhance productivity for both users and administrators. These features leverage Google's Gemini API to provide intelligent predictions, generate content, and analyze data.

## Quick Start Guide

### For Users

1. **Title Suggestions**: As you type a task title (after 3 characters), the system will suggest possible titles
2. **Category Prediction**: When creating a task, check "Use predicted category" to automatically assign the most likely category
3. **Description Generation**: Enter a brief summary and check "Generate description" to create a detailed task description

### For Administrators

1. **Critical Tasks Report**: Access the admin dashboard to view AI-generated reports on critical and overdue tasks
2. **Task Prioritization**: Use the prioritization feature to get AI recommendations on which tasks need attention first

## Features

### 1. Title Suggestions

The system suggests task titles as you type, helping you create more consistent and descriptive tasks.

**How it works:**
- Activates after you type at least 3 characters
- Analyzes your previous task titles for context
- Suggests relevant, professional task titles

**API Endpoint:**
```
GET /api/tasks/suggest/title?prefix=upd
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "Update project documentation",
      "Update client database",
      "Update marketing materials",
      "Update team on progress",
      "Update website content"
    ]
  }
}
```

### 2. Category Prediction

The system predicts which category a user is likely to use next based on their task history and the task title.

**How it works:**
- Analyzes the user's past task categories
- Uses the task title for context when available
- Identifies patterns in category usage
- Suggests the most likely category for the next task

**API Endpoint:**
```
GET /api/tasks/predict/next-category?taskTitle=Update marketing presentation
```

**Response:**
```json
{
  "success": true,
  "data": {
    "predictedCategory": "Marketing"
  }
}
```

**Integration with Task Creation:**
When creating a new task, you can automatically use the predicted category by setting `usePredictedCategory: true` in the request body.

### 3. Task Description Generation

Users can generate detailed task descriptions from brief summaries.

**How it works:**
- Takes a task title and a brief summary as input
- Uses AI to expand the summary into a comprehensive description
- Analyzes your previous task descriptions for style consistency
- Maintains professional language and formatting
- Includes actionable items and important considerations

**API Endpoint:**
```
POST /api/tasks/generate-description
```

**Request Body:**
```json
{
  "title": "Implement new authentication system",
  "summary": "Need to replace our current auth with OAuth2 and add MFA support"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "description": "Detailed AI-generated description..."
  }
}
```

**Integration with Task Creation:**
When creating a new task, you can automatically generate a description from a summary by setting `generateDescription: true` and including a `summary` field in the request body.

### 3. Task Prioritization

Users can get AI-powered suggestions for which tasks to focus on first.

**How it works:**
- Analyzes all active tasks assigned to or created by the user
- Considers factors like due dates, priorities, and task status
- Provides a prioritized list with explanations
- Identifies at-risk tasks and offers suggestions

**API Endpoint:**
```
GET /api/tasks/prioritize
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Here are your prioritized tasks based on urgency, importance, and deadlines.",
    "prioritizedTasks": [
      {
        "id": "task123",
        "title": "Complete project proposal",
        "reason": "Urgent priority, due tomorrow"
      }
    ],
    "logic": "Tasks are prioritized based on urgency, priority level, and due date.",
    "atRiskTasks": [
      {
        "id": "task456",
        "title": "Review code changes",
        "risk": "Due in 2 days with high priority"
      }
    ],
    "suggestions": [
      {
        "id": "task789",
        "title": "Update documentation",
        "suggestion": "Consider delegating this low-priority task"
      }
    ]
  }
}
```

### 4. Critical Tasks Report (Admin Only)

Administrators can generate comprehensive reports on critical and overdue tasks.

**How it works:**
- Analyzes all critical (high/urgent priority) and overdue tasks
- Identifies patterns and potential issues
- Generates an executive summary with actionable recommendations
- Provides statistics on task distribution

**API Endpoint:**
```
GET /api/admin/reports/critical-tasks
```

**Response:**
```json
{
  "success": true,
  "data": {
    "report": "Executive summary report...",
    "summary": {
      "criticalTasksCount": 10,
      "overdueTasksCount": 15,
      "totalTasksCount": 25
    },
    "topUsers": [
      {
        "id": "user123",
        "name": "John Doe",
        "email": "john@example.com",
        "taskCount": 5
      }
    ],
    "tasks": [
      {
        "id": "task123",
        "title": "Complete project proposal",
        "priority": "HIGH",
        "status": "PENDING",
        "dueDate": "2023-12-01T00:00:00.000Z",
        "isOverdue": true,
        "assignedTo": "Jane Smith",
        "createdBy": "John Doe"
      }
    ]
  }
}
```

## Implementation Details

### Technology Stack

- **AI Provider**: Google Gemini API
- **API Key**: Configured via environment variable `GEMINI_API_KEY`
- **HTTP Client**: Axios for API requests

### Testing

A test script is available to verify the AI functionality:

```
node test-ai-features.js
```

### Error Handling

All AI features include robust error handling:
- Graceful fallbacks when AI services are unavailable
- Appropriate error messages for users
- Logging for debugging purposes

## Performance Optimizations

The AI features include several optimizations to ensure good performance:

### Caching System
- **Short-term cache (5 minutes)**: For frequently changing data like category predictions
- **Medium-term cache (1 hour)**: For stable content like generated descriptions
- **Long-term cache (24 hours)**: For rarely changing data like reports

### Error Handling
- Graceful fallbacks when AI services are unavailable
- Default algorithms when AI responses can't be parsed
- Comprehensive logging for debugging

## Future Enhancements

Planned AI features for future releases:
- Workload balancing recommendations
- Natural language task creation
- Sentiment analysis of task descriptions
- Automated task categorization
- Meeting scheduling suggestions
- Team productivity insights