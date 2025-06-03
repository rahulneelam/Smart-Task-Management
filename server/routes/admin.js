import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken, requireAdmin, createAuditLog } from '../middleware/auth.js';
import { broadcastUserStatusChange } from '../middleware/userStatus.js';
import { generateCriticalTasksReport } from '../utils/aiUtils.js';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require admin authentication
router.use(authenticateToken, requireAdmin);

// Get all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (status !== undefined) {
      where.isActive = status === 'active';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Create user by admin
router.post('/users', [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3 }).trim(),
  body('firstName').isLength({ min: 1 }).trim(),
  body('lastName').isLength({ min: 1 }).trim(),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(['USER', 'ADMIN']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, username, firstName, lastName, password, role = 'USER' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        firstName,
        lastName,
        password: hashedPassword,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Create audit log
    await createAuditLog(
      req.user.id,
      'USER_CREATED_BY_ADMIN',
      'User',
      user.id,
      { createdUser: user, adminId: req.user.id },
      req
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get tasks for a specific user (admin only)
router.get('/users/:userId/tasks', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, status, priority } = req.query;
    const skip = (page - 1) * limit;

    const where = { createdById: userId };
    
    if (status) {
      where.status = status;
    }
    
    if (priority) {
      where.priority = priority;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get user tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalTasks,
      activeTasks,
      completedTasks,
      overdueTasks,
      recentUsers,
      recentTasks,
      activeUsers,
      inactiveUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
      prisma.task.count({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      prisma.task.count({
        where: { status: 'COMPLETED' },
      }),
      prisma.task.count({
        where: {
          dueDate: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          isActive: true,
        },
      }),
      prisma.task.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.user.count({
        where: { isActive: true },
      }),
      prisma.user.count({
        where: { isActive: false },
      }),
    ]);

    // Get task statistics by status
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Get task statistics by priority
    const tasksByPriority = await prisma.task.groupBy({
      by: ['priority'],
      _count: { priority: true },
    });

    // Get task statistics by user
    const topTaskCreators = await prisma.user.findMany({
      take: 10,
      orderBy: {
        tasks: {
          _count: 'desc',
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    // Get user registration trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const userRegistrationTrend = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { createdAt: true },
    });

    // Get task creation trend (last 7 days)
    const taskCreationTrend = await prisma.task.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { createdAt: true },
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          totalTasks,
          activeTasks,
          completedTasks,
          overdueTasks,
        },
        charts: {
          tasksByStatus: tasksByStatus.map(item => ({
            status: item.status,
            count: item._count.status,
          })),
          tasksByPriority: tasksByPriority.map(item => ({
            priority: item.priority,
            count: item._count.priority,
          })),
          userRegistrationTrend,
          taskCreationTrend,
        },
        topTaskCreators: topTaskCreators.map(user => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          isActive: user.isActive,
          taskCount: user._count.tasks,
        })),
        recent: {
          users: recentUsers,
          tasks: recentTasks,
        },
      },
    });
  } catch (error) {
    console.error('Get admin dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get admin settings
router.get('/settings', async (req, res) => {
  try {
    let settings = await prisma.adminSettings.findFirst();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.adminSettings.create({
        data: {
          id: 'default',
          siteName: 'Smart Task Manager',
          allowUserRegistration: true,
          maxTasksPerUser: 100,
        },
      });
    }

    res.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    console.error('Get admin settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Update admin settings
router.put('/settings', [
  body('siteName').optional().isLength({ min: 1 }).trim(),
  body('allowUserRegistration').optional().isBoolean(),
  body('maxTasksPerUser').optional().isInt({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { siteName, allowUserRegistration, maxTasksPerUser } = req.body;

    const updateData = {};
    if (siteName) updateData.siteName = siteName;
    if (typeof allowUserRegistration === 'boolean') updateData.allowUserRegistration = allowUserRegistration;
    if (maxTasksPerUser) updateData.maxTasksPerUser = maxTasksPerUser;

    let settings = await prisma.adminSettings.findFirst();
    
    if (!settings) {
      // Create settings if none exist
      settings = await prisma.adminSettings.create({
        data: {
          id: 'default',
          siteName: siteName || 'Smart Task Manager',
          allowUserRegistration: allowUserRegistration !== undefined ? allowUserRegistration : true,
          maxTasksPerUser: maxTasksPerUser || 100,
        },
      });
    } else {
      // Update existing settings
      settings = await prisma.adminSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings },
    });
  } catch (error) {
    console.error('Update admin settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 20, action, entity } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Create audit log entry
router.post('/audit-logs', [
  body('action').isLength({ min: 1 }).trim(),
  body('entity').isLength({ min: 1 }).trim(),
  body('entityId').optional().isString(),
  body('details').optional().isObject(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { action, entity, entityId, details } = req.body;

    const auditLog = await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action,
        entity,
        entityId,
        details,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Audit log created successfully',
      data: { auditLog },
    });
  } catch (error) {
    console.error('Create audit log error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get system health
router.get('/system/health', async (req, res) => {
  try {
    const dbHealth = await prisma.$queryRaw`SELECT 1 as health`;
    
    const systemInfo = {
      database: dbHealth ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { systemInfo },
    });
  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: {
        systemInfo: {
          database: 'unhealthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString(),
        },
      },
    });
  }
});

// Bulk operations for users
router.post('/users/bulk-action', [
  body('action').isIn(['activate', 'deactivate', 'delete']),
  body('userIds').isArray({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { action, userIds } = req.body;

    // Prevent admin from performing bulk actions on themselves
    if (userIds.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot perform bulk action on your own account',
      });
    }

    let result;
    switch (action) {
      case 'activate':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: true },
        });
        // Broadcast status change for each user
        for (const userId of userIds) {
          await broadcastUserStatusChange(userId, true);
          await createAuditLog(
            req.user.id,
            'USER_ACTIVATED_BY_ADMIN',
            'User',
            userId,
            { adminId: req.user.id },
            req
          );
        }
        break;
      case 'deactivate':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: false },
        });
        // Broadcast status change for each user
        for (const userId of userIds) {
          await broadcastUserStatusChange(userId, false);
          await createAuditLog(
            req.user.id,
            'USER_DEACTIVATED_BY_ADMIN',
            'User',
            userId,
            { adminId: req.user.id },
            req
          );
        }
        break;
      case 'delete':
        // Get user info before deletion for audit log
        const usersToDelete = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, username: true },
        });
        
        result = await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
        
        // Create audit logs for deletions
        for (const user of usersToDelete) {
          await createAuditLog(
            req.user.id,
            'USER_DELETED_BY_ADMIN',
            'User',
            user.id,
            { deletedUser: user, adminId: req.user.id },
            req
          );
        }
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action',
        });
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: { affectedCount: result.count },
    });
  } catch (error) {
    console.error('Bulk user action error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Bulk operations for tasks
router.post('/tasks/bulk-action', [
  body('action').isIn(['delete', 'complete', 'cancel']),
  body('taskIds').isArray({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { action, taskIds } = req.body;

    let result;
    switch (action) {
      case 'complete':
        result = await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { status: 'COMPLETED' },
        });
        break;
      case 'cancel':
        result = await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { status: 'CANCELLED' },
        });
        break;
      case 'delete':
        result = await prisma.task.deleteMany({
          where: { id: { in: taskIds } },
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action',
        });
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: { affectedCount: result.count },
    });
  } catch (error) {
    console.error('Bulk task action error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get all tasks with advanced filtering
router.get('/tasks', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      userId,
      assignedToId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      fromDate,
      toDate
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build the where clause based on filters
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    if (userId) {
      where.createdById = userId;
    }
    
    if (assignedToId) {
      where.assignedToId = assignedToId;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Date range filter
    if (fromDate || toDate) {
      where.createdAt = {};
      
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }
    
    // Determine sort order
    const orderBy = {};
    orderBy[sortBy] = sortOrder;
    
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);
    
    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get task status summary by user
router.get('/dashboard/user-task-summary', async (req, res) => {
  try {
    // Get all users with their task counts by status
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        isActive: true,
        role: true,
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    // Process the data to create a summary
    const userTaskSummary = users.map(user => {
      // Count tasks by status
      const taskStatusCounts = {
        PENDING: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      };

      user.tasks.forEach(task => {
        taskStatusCounts[task.status]++;
      });

      return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        username: user.username,
        isActive: user.isActive,
        role: user.role,
        taskCounts: {
          total: user.tasks.length,
          ...taskStatusCounts,
        },
      };
    });

    res.json({
      success: true,
      data: {
        userTaskSummary,
      },
    });
  } catch (error) {
    console.error('Get user task summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Generate critical and overdue tasks report
router.get('/reports/critical-tasks', async (req, res) => {
  try {
    // Get all critical and overdue tasks
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          // High or urgent priority tasks that aren't completed or cancelled
          {
            priority: { in: ['HIGH', 'URGENT'] },
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          // Overdue tasks that aren't completed or cancelled
          {
            dueDate: { lt: new Date() },
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
        ],
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });

    // Generate the report
    const report = await generateCriticalTasksReport(tasks);

    // Get summary statistics
    const criticalTasksCount = tasks.filter(task => 
      (task.priority === 'HIGH' || task.priority === 'URGENT') && 
      (task.status !== 'COMPLETED' && task.status !== 'CANCELLED')
    ).length;
    
    const overdueTasksCount = tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < new Date() && 
      (task.status !== 'COMPLETED' && task.status !== 'CANCELLED')
    ).length;

    // Get users with the most critical/overdue tasks
    const userTaskCounts = {};
    tasks.forEach(task => {
      const assigneeId = task.assignedToId || 'unassigned';
      userTaskCounts[assigneeId] = (userTaskCounts[assigneeId] || 0) + 1;
    });

    const usersSortedByTaskCount = Object.entries(userTaskCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Get user details for the top users
    const topUsers = [];
    for (const [userId, count] of usersSortedByTaskCount) {
      if (userId === 'unassigned') {
        topUsers.push({
          id: 'unassigned',
          name: 'Unassigned',
          taskCount: count
        });
      } else {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });
        
        if (user) {
          topUsers.push({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            taskCount: count
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        report,
        summary: {
          criticalTasksCount,
          overdueTasksCount,
          totalTasksCount: tasks.length,
        },
        topUsers,
        tasks: tasks.map(task => ({
          id: task.id,
          title: task.title,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate,
          isOverdue: task.dueDate && new Date(task.dueDate) < new Date(),
          assignedTo: task.assignedTo 
            ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
            : 'Unassigned',
          createdBy: `${task.createdBy.firstName} ${task.createdBy.lastName}`,
        })),
      },
    });
  } catch (error) {
    console.error('Generate critical tasks report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Activate/Deactivate user account
router.put('/users/:userId/status', [
  body('isActive').isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    // Prevent admin from deactivating themselves
    if (req.user.id === userId && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Broadcast status change
    await broadcastUserStatusChange(userId, isActive);

    // Create audit log
    await createAuditLog(
      req.user.id,
      isActive ? 'USER_ACTIVATED_BY_ADMIN' : 'USER_DEACTIVATED_BY_ADMIN',
      'User',
      userId,
      { adminId: req.user.id },
      req
    );

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Update user status error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;