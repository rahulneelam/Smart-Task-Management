import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin, createAuditLog } from '../middleware/auth.js';
import { predictNextCategory, generateTaskDescription, generateTaskPrioritization, generateTitleSuggestions } from '../utils/aiUtils.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all tasks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status, 
      priority, 
      category,
      assignedToId,
      createdById,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let where = {};
    
    if (req.user.role !== 'ADMIN') {
      // Regular users can only see tasks they created or are assigned to
      where.OR = [
        { createdById: req.user.id },
        { assignedToId: req.user.id },
      ];
    }

    // Add filters
    const filters = [];
    
    if (search) {
      filters.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    
    if (status) filters.push({ status });
    if (priority) filters.push({ priority });
    if (category) filters.push({ category });
    if (assignedToId) filters.push({ assignedToId });
    if (createdById) filters.push({ createdById });

    if (filters.length > 0) {
      where.AND = filters;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
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
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
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
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get all categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    // Get distinct categories from tasks that belong to the user
    let whereClause = {};
    
    if (req.user.role !== 'ADMIN') {
      // Regular users can only see categories from their tasks
      whereClause.OR = [
        { createdById: req.user.id },
        { assignedToId: req.user.id },
      ];
    }

    const categories = await prisma.task.findMany({
      where: {
        ...whereClause,
        category: {
          not: null,
        },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    const categoryList = categories.map(item => item.category).filter(Boolean);

    res.json({
      success: true,
      data: { categories: categoryList },
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
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
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user can access this task
    if (req.user.role !== 'ADMIN' && 
        task.createdById !== req.user.id && 
        task.assignedToId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});


// Create task
router.post('/', [
  body('title').isLength({ min: 1 }).trim(),
  body('description').optional().trim(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('category').optional().trim().isLength({ max: 50 }),
  body('summary').optional().trim(),
  body('dueDate').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true; // Allow null/empty/undefined
    return new Date(value).toString() !== 'Invalid Date'; // Validate date if provided
  }),
  body('assignedToId').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true; // Allow null/empty/undefined
    return typeof value === 'string'; // Must be string if provided
  }),
  body('usePredictedCategory').optional().isBoolean(),
  body('generateDescription').optional().isBoolean(),
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

    let { 
      title, 
      description, 
      priority = 'MEDIUM', 
      category, 
      summary,
      dueDate, 
      assignedToId,
      usePredictedCategory = false,
      generateDescription = false
    } = req.body;

    // Validate assigned user exists if provided (and not null/empty)
    if (assignedToId && assignedToId !== null && assignedToId !== '') {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId },
      });

      if (!assignedUser) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user not found',
        });
      }
    }
    
    // If user wants to use predicted category and no category was provided
    if (usePredictedCategory && (!category || category.trim() === '')) {
      // Get user's tasks
      const userTasks = await prisma.task.findMany({
        where: { createdById: req.user.id },
        select: {
          id: true,
          category: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      
      // Predict next category with title context
      const predictedCategory = await predictNextCategory(req.user.id, userTasks, title);
      if (predictedCategory) {
        category = predictedCategory;
      }
    }
    
    // If user wants to generate a description from summary
    if (generateDescription && summary && (!description || description.trim() === '')) {
      try {
        const generatedDescription = await generateTaskDescription(title, summary, req.user.id);
        if (generatedDescription) {
          description = generatedDescription;
        }
      } catch (error) {
        console.error('Error generating description:', error);
        // Continue with task creation even if description generation fails
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        category: category || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: req.user.id,
        assignedToId: assignedToId || null,
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
    });

    // Create audit log for task creation
    await createAuditLog(
      req.user.id,
      'TASK_CREATED',
      'Task',
      task.id,
      { 
        title: task.title, 
        assignedToId: task.assignedToId,
        usedPredictedCategory: usePredictedCategory && category === task.category,
        usedGeneratedDescription: generateDescription && description === task.description
      },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { 
        task,
        aiFeatures: {
          usedPredictedCategory: usePredictedCategory && category === task.category,
          usedGeneratedDescription: generateDescription && description === task.description
        }
      },
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Update task
router.put('/:id', [
  body('title').optional().isLength({ min: 1 }).trim(),
  body('description').optional().trim(),
  body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('category').optional().trim().isLength({ max: 50 }),
  body('dueDate').optional().custom((value) => {
    if (value === null || value === '') return true; // Allow null/empty
    if (!value) return true; // Allow undefined
    return new Date(value).toString() !== 'Invalid Date'; // Validate date
  }),
  body('assignedToId').optional().custom((value) => {
    if (value === null || value === '') return true; // Allow null/empty
    if (!value) return true; // Allow undefined
    return typeof value === 'string'; // Must be string if provided
  }),
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

    const { id } = req.params;
    const { title, description, status, priority, category, dueDate, assignedToId } = req.body;

    // Get existing task
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user can update this task
    if (req.user.role !== 'ADMIN' && 
        existingTask.createdById !== req.user.id && 
        existingTask.assignedToId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Validate assigned user exists if provided (and not null/empty)
    if (assignedToId && assignedToId !== null && assignedToId !== '') {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId },
      });

      if (!assignedUser) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user not found',
        });
      }
    }

    const updateData = {};
    if (title !== undefined && title !== '') updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined && status !== '') updateData.status = status;
    if (priority !== undefined && priority !== '') updateData.priority = priority;
    if (category !== undefined) updateData.category = category || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
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
    });

    // Create audit log for task update
    await createAuditLog(
      req.user.id,
      'TASK_UPDATED',
      'Task',
      updatedTask.id,
      { 
        changes: updateData,
        previousStatus: existingTask.status,
        newStatus: updatedTask.status 
      },
      req
    );

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task: updatedTask },
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing task
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user can delete this task
    if (req.user.role !== 'ADMIN' && existingTask.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    await prisma.task.delete({
      where: { id },
    });

    // Create audit log for task deletion
    await createAuditLog(
      req.user.id,
      'TASK_DELETED',
      'Task',
      id,
      { title: existingTask.title },
      req
    );

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get task statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    let where = {};
    
    if (req.user.role !== 'ADMIN') {
      where.OR = [
        { createdById: req.user.id },
        { assignedToId: req.user.id },
      ];
    }

    const [
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
    ] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: 'PENDING' } }),
      prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.task.count({
        where: {
          ...where,
          dueDate: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
      },
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get title suggestions based on prefix
router.get('/suggest/title', authenticateToken, async (req, res) => {
  try {
    const { prefix } = req.query;
    
    if (!prefix || prefix.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Prefix must be at least 3 characters long',
      });
    }
    
    // Generate title suggestions
    const suggestions = await generateTitleSuggestions(prefix, req.user.id);
    
    res.json({
      success: true,
      data: {
        suggestions,
      },
    });
  } catch (error) {
    console.error('Title suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Predict next category for a user
router.get('/predict/next-category', authenticateToken, async (req, res) => {
  try {
    const { taskTitle } = req.query;
    
    // Predict next category using the enhanced function
    // It will fetch tasks internally if needed
    const predictedCategory = await predictNextCategory(req.user.id, null, taskTitle);

    res.json({
      success: true,
      data: {
        predictedCategory,
      },
    });
  } catch (error) {
    console.error('Predict next category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Generate task description from summary
router.post('/generate-description', [
  authenticateToken,
  body('title').isLength({ min: 1 }).trim(),
  body('summary').isLength({ min: 1 }).trim(),
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

    const { title, summary } = req.body;
    
    // Generate description using the enhanced function with user context
    const generatedDescription = await generateTaskDescription(title, summary, req.user.id);

    if (!generatedDescription) {
      return res.status(400).json({
        success: false,
        message: 'Failed to generate description. Please try again or provide more details in your summary.',
      });
    }

    res.json({
      success: true,
      data: {
        description: generatedDescription,
      },
    });
  } catch (error) {
    console.error('Generate description error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get AI-powered task prioritization
router.get('/prioritize', authenticateToken, async (req, res) => {
  try {
    // Get user's active tasks
    const userTasks = await prisma.task.findMany({
      where: {
        OR: [
          { createdById: req.user.id },
          { assignedToId: req.user.id },
        ],
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate prioritization suggestions
    const prioritization = await generateTaskPrioritization(req.user.id, userTasks);

    res.json({
      success: true,
      data: prioritization,
    });
  } catch (error) {
    console.error('Task prioritization error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;