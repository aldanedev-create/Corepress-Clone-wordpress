// backend/src/config/cloudinary.ts
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import streamifier from 'streamifier';
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE_MB
} from './env';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

// Upload options interface
interface UploadOptions {
  folder?: string;
  public_id?: string;
  overwrite?: boolean;
  invalidate?: boolean;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  transformation?: any;
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
}

// File validation result interface
interface FileValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: string;
}

// Upload result interface
interface UploadResult {
  success: boolean;
  url?: string;
  secureUrl?: string;
  publicId?: string;
  resourceType?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  format?: string;
  error?: string;
  originalError?: any;
}

// Class for Cloudinary service
export class CloudinaryService {
  private static instance: CloudinaryService;

  private constructor() {
    // Initialize Cloudinary configuration
    this.validateConfiguration();
  }

  // Singleton instance
  public static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  // Validate Cloudinary configuration
  private validateConfiguration(): void {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      console.warn(
        'Cloudinary credentials are not configured. ' +
        'Some media upload features will be unavailable.'
      );
    }
  }

  // Validate file type
  private validateFileType(mimeType: string): FileValidationResult {
    // Check if file type is allowed
    if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
      return {
        isValid: false,
        error: `File type '${mimeType}' is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
      };
    }

    // Get file type category
    let fileCategory: string;
    if (mimeType.startsWith('image/')) {
      fileCategory = 'image';
    } else if (mimeType.startsWith('video/')) {
      fileCategory = 'video';
    } else {
      fileCategory = 'raw';
    }

    return {
      isValid: true,
      mimeType: fileCategory
    };
  }

  // Validate file size
  private validateFileSize(sizeInBytes: number): FileValidationResult {
    const maxSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024;

    if (sizeInBytes > maxSizeBytes) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed (${MAX_FILE_SIZE_MB}MB)`
      };
    }

    return {
      isValid: true
    };
  }

  // Upload file from buffer
  public async uploadFromBuffer(
    fileBuffer: Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Determine file type from buffer
      const fileType = fileBuffer.slice(0, 12).toString('hex');
      let mimeType = 'application/octet-stream';

      // Simple MIME type detection from magic numbers
      if (fileType.startsWith('89504e47')) {
        mimeType = 'image/png';
      } else if (fileType.startsWith('ffd8ffe0') || fileType.startsWith('ffd8ffe1')) {
        mimeType = 'image/jpeg';
      } else if (fileType.startsWith('47494638')) {
        mimeType = 'image/gif';
      } else if (fileType.startsWith('52494646')) {
        mimeType = 'image/webp';
      } else if (fileType.startsWith('25504446')) {
        mimeType = 'application/pdf';
      } else if (fileType.startsWith('0000001c')) {
        mimeType = 'video/mp4';
      }

      // Validate file type
      const typeValidation = this.validateFileType(mimeType);
      if (!typeValidation.isValid) {
        return {
          success: false,
          error: typeValidation.error
        };
      }

      // Validate file size
      const sizeValidation = this.validateFileSize(fileBuffer.length);
      if (!sizeValidation.isValid) {
        return {
          success: false,
          error: sizeValidation.error
        };
      }

      // Prepare upload options
      const uploadOptions: any = {
        folder: options.folder || 'corepress/uploads',
        resource_type: options.resource_type || 'auto',
        overwrite: options.overwrite ?? true,
        invalidate: options.invalidate ?? true,
      };

      // Add transformations if provided
      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      // Set quality for images
      if (options.resource_type === 'image' && options.quality) {
        uploadOptions.quality = options.quality;
      }

      // Add public_id if specified
      if (options.public_id) {
        uploadOptions.public_id = options.public_id;
      }

      // Upload to Cloudinary
      return new Promise<UploadResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error) {
              reject({
                success: false,
                error: error.message || 'Upload failed',
                originalError: error
              });
            } else if (result) {
              resolve({
                success: true,
                url: result.url,
                secureUrl: result.secure_url,
                publicId: result.public_id,
                resourceType: result.resource_type,
                fileName: result.original_filename,
                fileSize: result.bytes,
                width: result.width,
                height: result.height,
                format: result.format
              });
            } else {
              reject({
                success: false,
                error: 'Unknown upload error'
              });
            }
          }
        );

        // Pipe buffer to upload stream
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });

    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        originalError: error
      };
    }
  }

  // Upload file from local path
  public async uploadFromFile(
    filePath: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }

      // Read file
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);

      // Set original filename in options
      const uploadOptions: UploadOptions = {
        ...options,
        public_id: options.public_id || path.parse(fileName).name
      };

      // Upload from buffer
      return await this.uploadFromBuffer(fileBuffer, uploadOptions);

    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File upload failed',
        originalError: error
      };
    }
  }

  // Delete file
  public async deleteFile(publicId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return new Promise((resolve) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) {
            resolve({
              success: false,
              error: error.message || 'Delete failed'
            });
          } else {
            resolve({
              success: result.result === 'ok'
            });
          }
        });
      });
    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }

  // Get file info
  public async getFileInfo(publicId: string): Promise<any> {
    try {
      return new Promise((resolve, reject) => {
        cloudinary.api.resource(publicId, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      });
    } catch (error) {
      console.error('Get file info error:', error);
      throw error;
    }
  }

  // Generate URL with transformations
  public generateUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: 'scale' | 'fit' | 'limit' | 'fill' | 'pad';
      quality?: number;
      format?: string;
      effect?: string;
    } = {}
  ): string {
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        {
          width: options.width,
          height: options.height,
          crop: options.crop || 'limit',
          quality: options.quality || 'auto',
          format: options.format || 'auto',
          effect: options.effect
        }
      ]
    });
  }

  // Generate optimized URL
  public generateOptimizedUrl(
    publicId: string,
    width: number = 800,
    height: number = 600
  ): string {
    return this.generateUrl(publicId, {
      width,
      height,
      crop: 'fit',
      quality: 80,
      format: 'webp'
    });
  }

  // Generate thumbnail URL
  public generateThumbnailUrl(
    publicId: string,
    width: number = 150,
    height: number = 150
  ): string {
    return this.generateUrl(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 70,
      format: 'webp'
    });
  }

  // Check if Cloudinary is configured
  public isConfigured(): boolean {
    return !!(
      CLOUDINARY_CLOUD_NAME &&
      CLOUDINARY_API_KEY &&
      CLOUDINARY_API_SECRET
    );
  }
}

// Export singleton instance
export const cloudinaryService = CloudinaryService.getInstance();

// Export Cloudinary module for direct use
export { cloudinary };

// Export helper functions
export const uploadFromBuffer = cloudinaryService.uploadFromBuffer.bind(cloudinaryService);
export const uploadFromFile = cloudinaryService.uploadFromFile.bind(cloudinaryService);
export const deleteFile = cloudinaryService.deleteFile.bind(cloudinaryService);
export const getFileInfo = cloudinaryService.getFileInfo.bind(cloudinaryService);
export const generateUrl = cloudinaryService.generateUrl.bind(cloudinaryService);
export const generateOptimizedUrl = cloudinaryService.generateOptimizedUrl.bind(cloudinaryService);
export const generateThumbnailUrl = cloudinaryService.generateThumbnailUrl.bind(cloudinaryService);
export const isCloudinaryConfigured = cloudinaryService.isConfigured.bind(cloudinaryService);