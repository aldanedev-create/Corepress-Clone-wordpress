// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { JWT_SECRET } from '../config/env';
import { apiResponse } from '../utils/apiResponse';
import { ActivityLogService } from '../services/activity.service';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// JWT token payload interface
interface TokenPayload {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Authenticate middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiResponse.error(
        res,
        'Authentication required. Please provide a valid token.',
        401
      );
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return apiResponse.error(
        res,
        'Authentication required. Please provide a valid token.',
        401
      );
    }

    // Verify token
    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return apiResponse.error(res, 'Token has expired. Please login again.', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return apiResponse.error(res, 'Invalid token. Please login again.', 401);
      }
      return apiResponse.error(res, 'Authentication failed.', 401);
    }

    // Check if user exists and is active
    const user = await User.findById(decoded.id);
    if (!user) {
      return apiResponse.error(res, 'User not found. Please login again.', 401);
    }

    if (!user.isActive) {
      return apiResponse.error(res, 'Account is deactivated. Please contact admin.', 403);
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return apiResponse.error(res, 'Authentication failed.', 500);
  }
};

// Optional authentication (doesn't require token but attaches user if present)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      const user = await User.findById(decoded.id);
      
      if (user && user.isActive) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          role: user.role
        };
      }
    } catch (error) {
      // Token invalid, but that's okay for optional auth
      console.debug('Optional auth token invalid:', error);
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

// Verify token (for password reset, email verification, etc.)
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { token } = req.params;
    if (!token) {
      return apiResponse.error(res, 'Token is required', 400);
    }

    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return apiResponse.error(res, 'Token has expired', 400);
      }
      return apiResponse.error(res, 'Invalid token', 400);
    }

    // Check if user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return apiResponse.error(res, 'User not found', 404);
    }

    if (!user.isActive) {
      return apiResponse.error(res, 'Account is deactivated', 403);
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Verify token error:', error);
    return apiResponse.error(res, 'Token verification failed', 500);
  }
};

// Check if user is logged in (for public routes that show different content)
export const isLoggedIn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
          const user = await User.findById(decoded.id);
          if (user && user.isActive) {
            req.user = {
              id: user._id.toString(),
              email: user.email,
              role: user.role
            };
          }
        } catch (error) {
          // Token invalid, continue as guest
        }
      }
    }
    next();
  } catch (error) {
    console.error('Is logged in middleware error:', error);
    next();
  }
};

// Rate limiting middleware (to be used with express-rate-limit)
export const authRateLimiter = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
};

// Log authentication attempts
export const logAuthAttempt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const originalSend = res.send;
  
  res.send = function(body: any): Response {
    // Capture response status
    const statusCode = res.statusCode;
    
    // Log authentication attempts
    if (statusCode === 401 || statusCode === 403) {
      const email = req.body?.email || 'unknown';
      ActivityLogService.log({
        userId: null,
        action: 'LOGIN_FAILED',
        details: `Failed login attempt for ${email}`,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        metadata: {
          statusCode,
          path: req.path,
          method: req.method
        }
      }).catch(error => console.error('Failed to log auth attempt:', error));
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};