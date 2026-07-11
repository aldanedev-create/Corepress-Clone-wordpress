// backend/src/controllers/media.controller.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Media from '../models/Media';
import { cloudinaryService } from '../config/cloudinary';
import { apiResponse } from '../utils/apiResponse';
import { ActivityLogService } from '../services/activity.service';
import fs from 'fs';
import path from 'path';
import { MAX_FILE_SIZE_MB, ALLOWED_FILE_TYPES } from '../config/env';

// Get all media
export const getMedia = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {
      page = 1,
      limit = 50,
      fileType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build filter
    const filter: any = {};
    if (fileType) {
      filter.fileType = { $regex: fileType, $options: 'i' };
    }
    if (search) {
      filter.fileName = { $regex: search, $options: 'i' };
    }

    // Sort
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get media
    const media = await Media.find(filter)
      .populate('uploadedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNumber)
      .lean();

    const total = await Media.countDocuments(filter);

    return apiResponse.success(res, 'Media retrieved successfully', {
      media,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    console.error('Get media error:', error);
    return apiResponse.error(res, 'Failed to retrieve media', 500);
  }
};

// Upload media
export const uploadMedia = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Check if file exists
    if (!req.file) {
      return apiResponse.error(res, 'No file uploaded', 400);
    }

    const file = req.file;
    const folder = req.body.folder || 'corepress/media';

    // Check file size
    const maxSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return apiResponse.error(res, `File size exceeds maximum allowed (${MAX_FILE_SIZE_MB}MB)`, 400);
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      return apiResponse.error(res, `File type ${file.mimetype} not allowed`, 400);
    }

    // Upload to Cloudinary
    let uploadResult;
    try {
      uploadResult = await cloudinaryService.uploadFromBuffer(file.buffer, {
        folder,
        resource_type: 'auto'
      });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return apiResponse.error(res, 'Failed to upload file to cloud storage', 500);
    }

    if (!uploadResult.success) {
      return apiResponse.error(res, uploadResult.error || 'Upload failed', 500);
    }

    // Save media record
    const media = await Media.create({
      fileName: file.originalname,
      fileUrl: uploadResult.secureUrl || uploadResult.url || '',
      fileType: file.mimetype,
      fileSize: file.size,
      publicId: uploadResult.publicId || '',
      uploadedBy: user.id,
      createdAt: new Date()
    });

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'MEDIA_UPLOAD',
      details: `User ${user.email} uploaded media: ${file.originalname}`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Media uploaded successfully', media, 201);
  } catch (error) {
    console.error('Upload media error:', error);
    return apiResponse.error(res, 'Failed to upload media', 500);
  }
};

// Delete media
export const deleteMedia = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Find media
    const media = await Media.findById(id);
    if (!media) {
      return apiResponse.error(res, 'Media not found', 404);
    }

    // Check permission
    if (media.uploadedBy.toString() !== user.id && !['admin', 'super_admin'].includes(user.role)) {
      return apiResponse.error(res, 'You do not have permission to delete this media', 403);
    }

    // Delete from Cloudinary
    if (media.publicId) {
      const deleteResult = await cloudinaryService.deleteFile(media.publicId);
      if (!deleteResult.success) {
        console.warn('Failed to delete from Cloudinary:', deleteResult.error);
      }
    }

    // Delete from database
    await Media.findByIdAndDelete(id);

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'MEDIA_DELETE',
      details: `User ${user.email} deleted media: ${media.fileName}`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Media deleted successfully');
  } catch (error) {
    console.error('Delete media error:', error);
    return apiResponse.error(res, 'Failed to delete media', 500);
  }
};

// Get media by ID
export const getMediaById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const media = await Media.findById(id)
      .populate('uploadedBy', 'name email')
      .lean();

    if (!media) {
      return apiResponse.error(res, 'Media not found', 404);
    }

    return apiResponse.success(res, 'Media retrieved successfully', media);
  } catch (error) {
    console.error('Get media error:', error);
    return apiResponse.error(res, 'Failed to retrieve media', 500);
  }
};

// Update media metadata
export const updateMedia = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { fileName, altText } = req.body;
    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Find media
    const media = await Media.findById(id);
    if (!media) {
      return apiResponse.error(res, 'Media not found', 404);
    }

    // Check permission
    if (media.uploadedBy.toString() !== user.id && !['admin', 'super_admin'].includes(user.role)) {
      return apiResponse.error(res, 'You do not have permission to update this media', 403);
    }

    // Update
    const updateData: any = {};
    if (fileName) updateData.fileName = fileName;
    if (altText) updateData.altText = altText;

    const updatedMedia = await Media.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return apiResponse.success(res, 'Media updated successfully', updatedMedia);
  } catch (error) {
    console.error('Update media error:', error);
    return apiResponse.error(res, 'Failed to update media', 500);
  }
};

// Bulk delete media
export const bulkDeleteMedia = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { ids } = req.body;
    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return apiResponse.error(res, 'No media IDs provided', 400);
    }

    // Find media
    const mediaItems = await Media.find({ _id: { $in: ids } });
    if (mediaItems.length === 0) {
      return apiResponse.error(res, 'No media found', 404);
    }

    // Check permissions
    const hasPermission = mediaItems.every(
      item => item.uploadedBy.toString() === user.id || ['admin', 'super_admin'].includes(user.role)
    );

    if (!hasPermission) {
      return apiResponse.error(res, 'You do not have permission to delete some of the media', 403);
    }

    // Delete from Cloudinary
    for (const media of mediaItems) {
      if (media.publicId) {
        await cloudinaryService.deleteFile(media.publicId);
      }
    }

    // Delete from database
    await Media.deleteMany({ _id: { $in: ids } });

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'MEDIA_BULK_DELETE',
      details: `User ${user.email} bulk deleted ${ids.length} media files`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, `${ids.length} media files deleted successfully`);
  } catch (error) {
    console.error('Bulk delete media error:', error);
    return apiResponse.error(res, 'Failed to delete media', 500);
  }
};