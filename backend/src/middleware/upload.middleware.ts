// backend/src/middleware/upload.middleware.ts
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_MB } from '../config/env';
import { apiResponse } from '../utils/apiResponse';

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create subdirectory based on file type
    let subDir = 'others';
    if (file.mimetype.startsWith('image/')) {
      subDir = 'images';
    } else if (file.mimetype.startsWith('video/')) {
      subDir = 'videos';
    } else if (file.mimetype === 'application/pdf') {
      subDir = 'pdfs';
    }
    
    const targetDir = path.join(uploadDir, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const extension = path.extname(file.originalname);
    const filename = `${uuidv4()}${extension}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`));
  }
};

// Multer upload instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
    files: 10 // Maximum number of files
  }
});

// Custom upload middleware with error handling
export const uploadMiddleware = (fieldName: string = 'file', maxCount: number = 1) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const uploadHandler = upload.array(fieldName, maxCount);
    
    uploadHandler(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'FILE_TOO_LARGE') {
            return apiResponse.error(
              res,
              `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
              400
            );
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return apiResponse.error(
              res,
              `Too many files. Maximum is ${maxCount} files.`,
              400
            );
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return apiResponse.error(
              res,
              `Unexpected field. Expected "${fieldName}".`,
              400
            );
          }
          return apiResponse.error(res, `Upload error: ${err.message}`, 400);
        }
        
        if (err.message.includes('not allowed')) {
          return apiResponse.error(res, err.message, 400);
        }
        
        console.error('Upload error:', err);
        return apiResponse.error(res, 'Upload failed. Please try again.', 500);
      }
      
      next();
    });
  };
};

// Single file upload
export const uploadSingle = (fieldName: string = 'file') => {
  return uploadMiddleware(fieldName, 1);
};

// Multiple files upload
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 5) => {
  return uploadMiddleware(fieldName, maxCount);
};

// Validate file existence
export const validateFile = (req: Request, res: Response, next: NextFunction): void | Response => {
  if (!req.file && !req.files) {
    return apiResponse.error(res, 'No file uploaded.', 400);
  }
  next();
};

// Get file info
export const getFileInfo = (req: Request, res: Response, next: NextFunction): void | Response => {
  try {
    if (!req.file) {
      return next();
    }
    
    // Add file info to request body for controller
    const file = req.file as Express.Multer.File;
    req.body.fileInfo = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      destination: file.destination,
      filename: file.filename,
      path: file.path
    };
    
    next();
  } catch (error) {
    console.error('Get file info error:', error);
    return apiResponse.error(res, 'Failed to process file information.', 500);
  }
};

// Clean up uploaded files on error
export const cleanupOnError = (req: Request, res: Response, next: NextFunction): void => {
  const originalSend = res.send;
  
  res.send = function(body: any): Response {
    // If there's an error, clean up uploaded files
    if (res.statusCode >= 400) {
      const files = req.files as Express.Multer.File[] || [];
      const file = req.file as Express.Multer.File;
      
      const allFiles = [...files];
      if (file) {
        allFiles.push(file);
      }
      
      for (const f of allFiles) {
        if (f.path && fs.existsSync(f.path)) {
          try {
            fs.unlinkSync(f.path);
          } catch (error) {
            console.error('Failed to cleanup file:', f.path, error);
          }
        }
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

// Validate file type and size
export const validateFileType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const files = req.files as Express.Multer.File[] || [];
    const file = req.file as Express.Multer.File;
    
    const allFiles = [...files];
    if (file) {
      allFiles.push(file);
    }
    
    for (const f of allFiles) {
      if (!allowedTypes.includes(f.mimetype)) {
        return apiResponse.error(
          res,
          `File type ${f.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
          400
        );
      }
    }
    
    next();
  };
};

// Validate file size
export const validateFileSize = (maxSizeMB: number) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const files = req.files as Express.Multer.File[] || [];
    const file = req.file as Express.Multer.File;
    
    const allFiles = [...files];
    if (file) {
      allFiles.push(file);
    }
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    for (const f of allFiles) {
      if (f.size > maxSizeBytes) {
        return apiResponse.error(
          res,
          `File ${f.originalname} is too large. Maximum size is ${maxSizeMB}MB.`,
          400
        );
      }
    }
    
    next();
  };
};