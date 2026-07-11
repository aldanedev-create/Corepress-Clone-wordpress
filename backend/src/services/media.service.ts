// backend/src/services/media.service.ts
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import Media, { IMedia } from '../models/Media';
import { cloudinaryService } from '../config/cloudinary';
import { AppError } from '../middleware/error.middleware';
import { ActivityLogService } from './activity.service';

// Media service interface
export interface IMediaService {
  uploadFile(file: Express.Multer.File, userId: string, options?: UploadOptions): Promise<IMedia>;
  uploadMultipleFiles(files: Express.Multer.File[], userId: string, options?: UploadOptions): Promise<IMedia[]>;
  deleteMedia(mediaId: string, userId: string): Promise<void>;
  bulkDeleteMedia(mediaIds: string[], userId: string): Promise<void>;
  getMediaById(mediaId: string): Promise<IMedia | null>;
  getMediaList(options: ListMediaOptions): Promise<{ media: IMedia[]; total: number }>;
  optimizeImage(mediaId: string, options?: OptimizeOptions): Promise<IMedia>;
  generateThumbnail(mediaId: string, width?: number, height?: number): Promise<string>;
  getMediaStats(): Promise<any>;
  cleanupTempFiles(): Promise<void>;
}

// Types
export interface UploadOptions {
  folder?: string;
  optimize?: boolean;
  generateThumbnail?: boolean;
  altText?: string;
  metadata?: Record<string, any>;
}

export interface OptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  crop?: 'cover' | 'contain' | 'fill';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ListMediaOptions {
  page?: number;
  limit?: number;
  fileType?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Media service implementation
class MediaService implements IMediaService {
  private static instance: MediaService;
  private tempDir: string;

  private constructor() {
    this.tempDir = path.join(__dirname, '../../uploads/temp');
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  public static getInstance(): MediaService {
    if (!MediaService.instance) {
      MediaService.instance = new MediaService();
    }
    return MediaService.instance;
  }

  // Upload single file
  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    options: UploadOptions = {}
  ): Promise<IMedia> {
    try {
      const { folder = 'corepress/media', optimize = true, generateThumbnail = true, altText, metadata } = options;

      // Validate file
      this.validateFile(file);

      // Upload to Cloudinary
      let uploadResult;
      try {
        uploadResult = await cloudinaryService.uploadFromBuffer(file.buffer, {
          folder,
          resource_type: 'auto'
        });
      } catch (error) {
        throw new AppError('Failed to upload file to cloud storage', 500);
      }

      if (!uploadResult.success) {
        throw new AppError(uploadResult.error || 'Upload failed', 500);
      }

      // Create media record
      const media = await Media.create({
        fileName: file.originalname,
        fileUrl: uploadResult.secureUrl || uploadResult.url || '',
        fileType: file.mimetype,
        fileSize: file.size,
        publicId: uploadResult.publicId || '',
        altText: altText || file.originalname.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        uploadedBy: userId,
        metadata: metadata || {},
        isOptimized: false,
        optimizedUrl: '',
        thumbnailUrl: ''
      });

      // Optimize if requested
      if (optimize && this.isImage(file.mimetype)) {
        await this.optimizeImage(media._id.toString(), {
          quality: 80,
          format: 'webp'
        });
      }

      // Generate thumbnail if requested
      if (generateThumbnail && this.isImage(file.mimetype)) {
        await this.generateThumbnail(media._id.toString());
      }

      // Log activity
      await ActivityLogService.log({
        userId,
        action: 'MEDIA_UPLOAD',
        details: `User uploaded media: ${file.originalname}`
      });

      return media;
    } catch (error) {
      throw error;
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    userId: string,
    options: UploadOptions = {}
  ): Promise<IMedia[]> {
    const results: IMedia[] = [];
    const errors: Error[] = [];

    for (const file of files) {
      try {
        const media = await this.uploadFile(file, userId, options);
        results.push(media);
      } catch (error) {
        errors.push(error as Error);
        console.error('Failed to upload file:', file.originalname, error);
      }
    }

    if (results.length === 0 && errors.length > 0) {
      throw new AppError('Failed to upload any files', 500, errors);
    }

    return results;
  }

  // Delete media
  async deleteMedia(mediaId: string, userId: string): Promise<void> {
    try {
      const media = await Media.findById(mediaId);
      if (!media) {
        throw new AppError('Media not found', 404);
      }

      // Check permission
      if (media.uploadedBy.toString() !== userId) {
        // Check if user is admin
        const user = await import('../models/User').then(m => m.default.findById(userId));
        if (!user || !['admin', 'super_admin'].includes(user.role)) {
          throw new AppError('You do not have permission to delete this media', 403);
        }
      }

      // Delete from Cloudinary
      if (media.publicId) {
        const deleteResult = await cloudinaryService.deleteFile(media.publicId);
        if (!deleteResult.success) {
          console.warn('Failed to delete from Cloudinary:', deleteResult.error);
        }
      }

      // Delete from database
      await Media.findByIdAndDelete(mediaId);

      // Log activity
      await ActivityLogService.log({
        userId,
        action: 'MEDIA_DELETE',
        details: `User deleted media: ${media.fileName}`
      });
    } catch (error) {
      throw error;
    }
  }

  // Bulk delete media
  async bulkDeleteMedia(mediaIds: string[], userId: string): Promise<void> {
    try {
      const mediaItems = await Media.find({ _id: { $in: mediaIds } });
      if (mediaItems.length === 0) {
        throw new AppError('No media found', 404);
      }

      // Check permissions
      const hasPermission = mediaItems.every(
        item => item.uploadedBy.toString() === userId
      );

      if (!hasPermission) {
        // Check if user is admin
        const user = await import('../models/User').then(m => m.default.findById(userId));
        if (!user || !['admin', 'super_admin'].includes(user.role)) {
          throw new AppError('You do not have permission to delete some media', 403);
        }
      }

      // Delete from Cloudinary
      for (const media of mediaItems) {
        if (media.publicId) {
          await cloudinaryService.deleteFile(media.publicId);
        }
      }

      // Delete from database
      await Media.deleteMany({ _id: { $in: mediaIds } });

      // Log activity
      await ActivityLogService.log({
        userId,
        action: 'MEDIA_BULK_DELETE',
        details: `User bulk deleted ${mediaIds.length} media files`
      });
    } catch (error) {
      throw error;
    }
  }

  // Get media by ID
  async getMediaById(mediaId: string): Promise<IMedia | null> {
    try {
      return await Media.findById(mediaId)
        .populate('uploadedBy', 'name email')
        .lean();
    } catch (error) {
      throw error;
    }
  }

  // Get media list
  async getMediaList(options: ListMediaOptions = {}): Promise<{ media: IMedia[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 50,
        fileType,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};
      if (fileType) {
        filter.fileType = { $regex: fileType, $options: 'i' };
      }
      if (search) {
        filter.$or = [
          { fileName: { $regex: search, $options: 'i' } },
          { altText: { $regex: search, $options: 'i' } }
        ];
      }

      // Sort
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const [media, total] = await Promise.all([
        Media.find(filter)
          .populate('uploadedBy', 'name email')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Media.countDocuments(filter)
      ]);

      return { media, total };
    } catch (error) {
      throw error;
    }
  }

  // Optimize image
  async optimizeImage(mediaId: string, options: OptimizeOptions = {}): Promise<IMedia> {
    try {
      const media = await Media.findById(mediaId);
      if (!media) {
        throw new AppError('Media not found', 404);
      }

      if (!this.isImage(media.fileType)) {
        throw new AppError('Only images can be optimized', 400);
      }

      // Download image from Cloudinary
      const response = await fetch(media.fileUrl);
      const buffer = await response.arrayBuffer();

      // Optimize using sharp
      const {
        width = 1920,
        height = 1080,
        quality = 80,
        format = 'webp',
        crop = 'cover',
        fit = 'cover'
      } = options;

      let sharpInstance = sharp(Buffer.from(buffer));

      // Resize if dimensions provided
      if (width || height) {
        sharpInstance = sharpInstance.resize(width, height, {
          fit: fit as any,
          position: 'center'
        });
      }

      // Convert format
      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ quality });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
        case 'avif':
          sharpInstance = sharpInstance.avif({ quality });
          break;
      }

      // Get optimized buffer
      const optimizedBuffer = await sharpInstance.toBuffer();

      // Upload optimized image to Cloudinary
      const uploadResult = await cloudinaryService.uploadFromBuffer(optimizedBuffer, {
        folder: 'corepress/optimized',
        resource_type: 'image'
      });

      if (!uploadResult.success) {
        throw new AppError('Failed to upload optimized image', 500);
      }

      // Update media record
      media.isOptimized = true;
      media.optimizedUrl = uploadResult.secureUrl || uploadResult.url || '';
      media.format = format;
      await media.save();

      return media;
    } catch (error) {
      throw error;
    }
  }

  // Generate thumbnail
  async generateThumbnail(mediaId: string, width: number = 200, height: number = 200): Promise<string> {
    try {
      const media = await Media.findById(mediaId);
      if (!media) {
        throw new AppError('Media not found', 404);
      }

      if (!this.isImage(media.fileType)) {
        throw new AppError('Only images can have thumbnails', 400);
      }

      // Generate thumbnail URL from Cloudinary
      const thumbnailUrl = cloudinaryService.generateThumbnailUrl(media.publicId, width, height);

      // Update media record
      media.thumbnailUrl = thumbnailUrl;
      await media.save();

      return thumbnailUrl;
    } catch (error) {
      throw error;
    }
  }

  // Get media statistics
  async getMediaStats(): Promise<any> {
    try {
      const total = await Media.countDocuments();
      const totalSize = await Media.aggregate([
        { $group: { _id: null, total: { $sum: '$fileSize' } } }
      ]);

      const byType = await Media.aggregate([
        { $group: { _id: '$fileType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const recent = await Media.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      return {
        total,
        totalSize: totalSize[0]?.total || 0,
        totalSizeMB: ((totalSize[0]?.total || 0) / (1024 * 1024)).toFixed(2),
        byType,
        recent
      };
    } catch (error) {
      throw error;
    }
  }

  // Cleanup temporary files
  async cleanupTempFiles(): Promise<void> {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        // Delete files older than 1 hour
        if (age > 3600000) {
          fs.unlinkSync(filePath);
          console.log('Deleted temp file:', filePath);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  // Validate file
  private validateFile(file: Express.Multer.File): void {
    // Check file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new AppError(`File size exceeds maximum allowed (10MB)`, 400);
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'image/svg+xml', 'video/mp4', 'video/webm',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new AppError(`File type ${file.mimetype} is not allowed`, 400);
    }
  }

  // Check if file is image
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }
}

// Export singleton instance
export const mediaService = MediaService.getInstance();
export default mediaService;