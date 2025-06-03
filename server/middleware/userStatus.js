import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware to check if user is still active
export const checkUserStatus = async (req, res, next) => {
  // Skip status check for auth routes
  if (req.path.startsWith('/api/auth/')) {
    return next();
  }

  // Only check status for authenticated requests
  if (!req.user) {
    return next();
  }

  // Only enforce strict status check for admin operations
  const adminOnlyPaths = [
    '/api/admin'
  ];

  const isAdminOperation = adminOnlyPaths.some(path => req.path.startsWith(path));

  // For regular operations, don't check status at all - let users continue working
  if (!isAdminOperation) {
    return next();
  }

  // Strict check for sensitive operations
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated by administrator',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    next();
  } catch (error) {
    console.error('User status check error:', error);
    next();
  }
};

// Strict user status check for admin operations
export const requireActiveUser = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated by administrator',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    next();
  } catch (error) {
    console.error('User status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// WebSocket-like functionality for real-time user status updates
export const broadcastUserStatusChange = async (userId, isActive) => {
  // This would typically use WebSocket or Server-Sent Events
  // For now, we'll just log the change
  console.log(`User ${userId} status changed to: ${isActive ? 'active' : 'inactive'}`);
  
  // In a real implementation, you would:
  // 1. Maintain a list of connected clients
  // 2. Send status updates to all connected clients
  // 3. Force logout inactive users on admin action
};