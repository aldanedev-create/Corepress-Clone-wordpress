// backend/src/middleware/role.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { apiResponse } from '../utils/apiResponse';

// Role hierarchy
const ROLE_HIERARCHY: Record<string, number> = {
  'super_admin': 5,
  'admin': 4,
  'editor': 3,
  'author': 2,
  'viewer': 1
};

// User permissions
const PERMISSIONS: Record<string, Record<string, string[]>> = {
  super_admin: {
    all: ['*']
  },
  admin: {
    posts: ['create', 'read', 'update', 'delete', 'publish'],
    pages: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    categories: ['create', 'read', 'update', 'delete'],
    media: ['create', 'read', 'update', 'delete'],
    settings: ['read', 'update'],
    seo: ['create', 'read', 'update']
  },
  editor: {
    posts: ['create', 'read', 'update', 'publish'],
    pages: ['create', 'read', 'update'],
    categories: ['read'],
    media: ['create', 'read'],
    seo: ['create', 'read']
  },
  author: {
    posts: ['create', 'read', 'update'],
    pages: ['read'],
    categories: ['read'],
    media: ['create', 'read']
  },
  viewer: {
    posts: ['read'],
    pages: ['read']
  }
};

// Authorize middleware (check if user has required role)
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      const user = req.user;
      
      if (!user) {
        return apiResponse.error(
          res,
          'Authentication required. Please login first.',
          401
        );
      }

      // Check if user role is in the allowed roles
      const hasRole = roles.some(role => user.role === role);
      
      // Super admin has all permissions
      if (user.role === 'super_admin') {
        return next();
      }
      
      if (!hasRole) {
        return apiResponse.error(
          res,
          'Access denied. You do not have the required permissions.',
          403
        );
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return apiResponse.error(res, 'Authorization failed.', 500);
    }
  };
};

// Check if user has specific permission
export const hasPermission = (resource: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      const user = req.user;
      
      if (!user) {
        return apiResponse.error(
          res,
          'Authentication required. Please login first.',
          401
        );
      }

      // Super admin has all permissions
      if (user.role === 'super_admin') {
        return next();
      }

      const userPermissions = PERMISSIONS[user.role];
      if (!userPermissions) {
        return apiResponse.error(res, 'Access denied. Invalid role.', 403);
      }

      // Check if user has permission for the resource and action
      const resourcePermissions = userPermissions[resource];
      if (!resourcePermissions) {
        return apiResponse.error(res, 'Access denied. Resource not found.', 403);
      }

      if (!resourcePermissions.includes(action) && !resourcePermissions.includes('*')) {
        return apiResponse.error(
          res,
          `Access denied. You don't have permission to ${action} ${resource}.`,
          403
        );
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return apiResponse.error(res, 'Permission check failed.', 500);
    }
  };
};

// Check if user owns the resource
export const isOwner = (getOwnerId: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      const user = req.user;
      
      if (!user) {
        return apiResponse.error(
          res,
          'Authentication required. Please login first.',
          401
        );
      }

      // Super admin and admin can access all resources
      if (user.role === 'super_admin' || user.role === 'admin') {
        return next();
      }

      const ownerId = getOwnerId(req);
      
      if (user.id !== ownerId) {
        return apiResponse.error(
          res,
          'Access denied. You do not own this resource.',
          403
        );
      }

      next();
    } catch (error) {
      console.error('Owner check error:', error);
      return apiResponse.error(res, 'Owner check failed.', 500);
    }
  };
};

// Check role hierarchy (for operations like user management)
export const hasHigherRole = (targetRole: string) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      const user = req.user;
      
      if (!user) {
        return apiResponse.error(
          res,
          'Authentication required. Please login first.',
          401
        );
      }

      const userLevel = ROLE_HIERARCHY[user.role] || 0;
      const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

      // Super admin has all permissions
      if (user.role === 'super_admin') {
        return next();
      }

      if (userLevel <= targetLevel) {
        return apiResponse.error(
          res,
          'Access denied. You cannot manage users with higher or equal role.',
          403
        );
      }

      next();
    } catch (error) {
      console.error('Role hierarchy check error:', error);
      return apiResponse.error(res, 'Role hierarchy check failed.', 500);
    }
  };
};

// Check if user is active
export const isActive = (req: Request, res: Response, next: NextFunction): void | Response => {
  try {
    const user = req.user;
    
    if (!user) {
      return apiResponse.error(
        res,
        'Authentication required. Please login first.',
        401
      );
    }

    // User is already checked in auth middleware
    next();
  } catch (error) {
    console.error('Active check error:', error);
    return apiResponse.error(res, 'Active check failed.', 500);
  }
};

// Restrict by IP (for admin routes)
export const restrictByIP = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      const clientIP = req.ip || req.socket.remoteAddress || '';
      
      // Remove IPv6 prefix if present
      const cleanIP = clientIP.replace(/^::ffff:/, '');
      
      if (!allowedIPs.includes(cleanIP) && !allowedIPs.includes('*')) {
        return apiResponse.error(
          res,
          'Access denied. Your IP address is not allowed.',
          403
        );
      }

      next();
    } catch (error) {
      console.error('IP restriction error:', error);
      return apiResponse.error(res, 'IP restriction check failed.', 500);
    }
  };
};