// backend/src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { apiResponse } from '../utils/apiResponse';
import { ActivityLogService } from '../services/activity.service';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: any[];

  constructor(message: string, statusCode: number, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors?: any[]) {
    super(message, 400, errors);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  // Log error
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?.id
  });

  // Log to activity log for critical errors
  if (err instanceof AppError && err.statusCode >= 500) {
    ActivityLogService.log({
      userId: req.user?.id || null,
      action: 'ERROR_OCCURRED',
      details: `${err.name}: ${err.message}`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      metadata: {
        path: req.path,
        method: req.method,
        statusCode: err.statusCode,
        stack: err.stack
      },
      severity: 'error'
    }).catch(error => console.error('Failed to log error:', error));
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    return apiResponse.error(
      res,
      err.message,
      err.statusCode,
      err.errors
    );
  }

  // Handle MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    const mongoError = err as any;
    
    // Duplicate key error
    if (mongoError.code === 11000) {
      const field = Object.keys(mongoError.keyPattern)[0];
      return apiResponse.error(
        res,
        `Duplicate value for field: ${field}. Please use a unique value.`,
        409
      );
    }
    
    return apiResponse.error(
      res,
      'Database error occurred. Please try again.',
      500
    );
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const validationError = err as any;
    const errors = Object.values(validationError.errors).map((e: any) => ({
      field: e.path,
      message: e.message
    }));
    
    return apiResponse.error(
      res,
      'Validation error occurred.',
      400,
      errors
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return apiResponse.error(
      res,
      'Invalid token. Please login again.',
      401
    );
  }

  if (err.name === 'TokenExpiredError') {
    return apiResponse.error(
      res,
      'Token has expired. Please login again.',
      401
    );
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    const multerError = err as any;
    let message = 'File upload error.';
    
    if (multerError.code === 'FILE_TOO_LARGE') {
      message = 'File too large. Please upload a smaller file.';
    } else if (multerError.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded.';
    } else if (multerError.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field.';
    }
    
    return apiResponse.error(res, message, 400);
  }

  // Unknown errors
  return apiResponse.error(
    res,
    'Internal server error. Please try again later.',
    500
  );
};

// 404 Not Found middleware
export const notFound = (
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  return apiResponse.error(
    res,
    `Cannot ${req.method} ${req.path}. Route not found.`,
    404
  );
};

// Async handler wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Request logging middleware
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  const { method, path, ip } = req;
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Log when response is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Log only if status code is 400 or above
    if (statusCode >= 400) {
      console.warn(
        `[${new Date().toISOString()}] ${method} ${path} - ${statusCode} - ${duration}ms - ${ip} - ${userAgent}`
      );
    }
  });
  
  next();
};

// Rate limit error handler
export const rateLimitErrorHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  return apiResponse.error(
    res,
    'Too many requests. Please try again later.',
    429
  );
};

// Cleanup middleware (for cleaning up resources)
export const cleanup = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Clean up temporary files
  if (req.files) {
    const files = req.files as Express.Multer.File[];
    for (const file of files) {
      if (file.path && file.path.includes('tmp')) {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Failed to cleanup temp file:', err);
        });
      }
    }
  }
  
  next();
};