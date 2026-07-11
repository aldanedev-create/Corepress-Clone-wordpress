// backend/src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { apiResponse } from '../utils/apiResponse';

// Validate request
export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format errors
    const formattedErrors = errors.array().map((error: ValidationError) => {
      if (error.type === 'field') {
        return {
          field: error.path,
          message: error.msg,
          value: error.value
        };
      }
      return {
        message: error.msg,
        location: error.location
      };
    });
    
    return apiResponse.error(
      res,
      'Validation error. Please check your input.',
      400,
      formattedErrors
    );
  }
  
  next();
};

// Validate query parameters
export const validateQuery = (validators: any[]) => {
  return [
    ...validators,
    validate
  ];
};

// Validate body
export const validateBody = (validators: any[]) => {
  return [
    ...validators,
    validate
  ];
};

// Validate params
export const validateParams = (validators: any[]) => {
  return [
    ...validators,
    validate
  ];
};

// Sanitize HTML content
export const sanitizeHtml = (req: Request, res: Response, next: NextFunction): void => {
  // Only sanitize HTML fields
  const htmlFields = ['content', 'excerpt', 'seoDescription', 'description'];
  
  for (const field of htmlFields) {
    if (req.body[field]) {
      // Basic HTML sanitization
      req.body[field] = req.body[field]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/g, '')
        .replace(/on\w+='[^']*'/g, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:/gi, '');
    }
  }
  
  next();
};

// Sanitize strings
export const sanitizeString = (req: Request, res: Response, next: NextFunction): void => {
  const stringFields = ['title', 'name', 'slug', 'seoTitle'];
  
  for (const field of stringFields) {
    if (req.body[field]) {
      req.body[field] = req.body[field]
        .trim()
        .replace(/<[^>]*>/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }
  
  next();
};

// Validate email
export const validateEmail = (req: Request, res: Response, next: NextFunction): void | Response => {
  const emailFields = ['email', 'contactEmail'];
  
  for (const field of emailFields) {
    if (req.body[field]) {
      const email = req.body[field];
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      
      if (!emailRegex.test(email)) {
        return apiResponse.error(
          res,
          `Invalid email format for field: ${field}`,
          400
        );
      }
    }
  }
  
  next();
};

// Validate URL
export const validateUrl = (req: Request, res: Response, next: NextFunction): void | Response => {
  const urlFields = ['url', 'website', 'siteUrl'];
  
  for (const field of urlFields) {
    if (req.body[field]) {
      const url = req.body[field];
      try {
        new URL(url);
      } catch (error) {
        return apiResponse.error(
          res,
          `Invalid URL format for field: ${field}`,
          400
        );
      }
    }
  }
  
  next();
};

// Validate password strength
export const validatePasswordStrength = (req: Request, res: Response, next: NextFunction): void | Response => {
  const passwordFields = ['password', 'newPassword', 'currentPassword'];
  
  for (const field of passwordFields) {
    if (req.body[field]) {
      const password = req.body[field];
      
      // Check password strength
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      const isLongEnough = password.length >= 8;
      
      if (!isLongEnough) {
        return apiResponse.error(
          res,
          'Password must be at least 8 characters long.',
          400
        );
      }
      
      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        return apiResponse.error(
          res,
          'Password must contain uppercase, lowercase, and numbers.',
          400
        );
      }
      
      if (!hasSpecialChar) {
        return apiResponse.error(
          res,
          'Password must contain at least one special character.',
          400
        );
      }
    }
  }
  
  next();
};

// Validate date
export const validateDate = (req: Request, res: Response, next: NextFunction): void | Response => {
  const dateFields = ['date', 'publishedAt', 'startDate', 'endDate'];
  
  for (const field of dateFields) {
    if (req.body[field]) {
      const date = new Date(req.body[field]);
      if (isNaN(date.getTime())) {
        return apiResponse.error(
          res,
          `Invalid date format for field: ${field}`,
          400
        );
      }
    }
  }
  
  next();
};

// Validate phone number
export const validatePhone = (req: Request, res: Response, next: NextFunction): void | Response => {
  const phoneFields = ['phone', 'contactPhone'];
  
  for (const field of phoneFields) {
    if (req.body[field]) {
      const phone = req.body[field];
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,6}[-\s\.]?[0-9]{1,6}$/;
      
      if (!phoneRegex.test(phone)) {
        return apiResponse.error(
          res,
          `Invalid phone number format for field: ${field}`,
          400
        );
      }
    }
  }
  
  next();
};

// Validate slug
export const validateSlug = (req: Request, res: Response, next: NextFunction): void | Response => {
  const slugFields = ['slug'];
  
  for (const field of slugFields) {
    if (req.body[field]) {
      const slug = req.body[field];
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      
      if (!slugRegex.test(slug)) {
        return apiResponse.error(
          res,
          `Invalid slug format for field: ${field}. Use lowercase letters, numbers, and hyphens only.`,
          400
        );
      }
    }
  }
  
  next();
};

// Validate array
export const validateArray = (field: string, minLength?: number, maxLength?: number) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (req.body[field]) {
      if (!Array.isArray(req.body[field])) {
        return apiResponse.error(
          res,
          `Field "${field}" must be an array.`,
          400
        );
      }
      
      if (minLength !== undefined && req.body[field].length < minLength) {
        return apiResponse.error(
          res,
          `Field "${field}" must have at least ${minLength} items.`,
          400
        );
      }
      
      if (maxLength !== undefined && req.body[field].length > maxLength) {
        return apiResponse.error(
          res,
          `Field "${field}" cannot have more than ${maxLength} items.`,
          400
        );
      }
    }
    
    next();
  };
};

// Validate object
export const validateObject = (field: string, schema: Record<string, any>) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (req.body[field]) {
      if (typeof req.body[field] !== 'object' || Array.isArray(req.body[field])) {
        return apiResponse.error(
          res,
          `Field "${field}" must be an object.`,
          400
        );
      }
      
      // Check required fields
      for (const [key, value] of Object.entries(schema)) {
        if (value.required && !req.body[field][key]) {
          return apiResponse.error(
            res,
            `Field "${field}.${key}" is required.`,
            400
          );
        }
        
        if (req.body[field][key] !== undefined) {
          // Check type
          if (value.type === 'string' && typeof req.body[field][key] !== 'string') {
            return apiResponse.error(
              res,
              `Field "${field}.${key}" must be a string.`,
              400
            );
          }
          
          if (value.type === 'number' && typeof req.body[field][key] !== 'number') {
            return apiResponse.error(
              res,
              `Field "${field}.${key}" must be a number.`,
              400
            );
          }
          
          if (value.type === 'boolean' && typeof req.body[field][key] !== 'boolean') {
            return apiResponse.error(
              res,
              `Field "${field}.${key}" must be a boolean.`,
              400
            );
          }
        }
      }
    }
    
    next();
  };
};

// Validate request body size
export const validateBodySize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSize) {
      return apiResponse.error(
        res,
        `Request body too large. Maximum size is ${maxSize / 1024 / 1024}MB.`,
        413
      );
    }
    
    next();
  };
};