// admin/src/api/media.api.ts
import { get, post, put, del, uploadFile, uploadMultipleFiles } from './axios';
import { Media, MediaFilters, PaginatedResponse } from '../types/media.types';

// Media API endpoints
const MEDIA_ENDPOINTS = {
  GET_ALL: '/media',
  GET_BY_ID: (id: string) => `/media/${id}`,
  UPLOAD: '/media/upload',
  UPLOAD_MULTIPLE: '/media/upload-multiple',
  DELETE: (id: string) => `/media/${id}`,
  UPDATE: (id: string) => `/media/${id}`,
  BULK_DELETE: '/media/bulk-delete',
  STATS: '/media/stats',
  OPTIMIZE: (id: string) => `/media/${id}/optimize`,
  THUMBNAIL: (id: string) => `/media/${id}/thumbnail`
};

// Get all media with pagination and filters
export const getMedia = async (filters: MediaFilters = {}): Promise<PaginatedResponse<Media>> => {
  const queryParams = new URLSearchParams();
  
  if (filters.page) queryParams.append('page', filters.page.toString());
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  if (filters.fileType) queryParams.append('fileType', filters.fileType);
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
  
  const url = `${MEDIA_ENDPOINTS.GET_ALL}?${queryParams.toString()}`;
  return await get<PaginatedResponse<Media>>(url);
};

// Get media by ID
export const getMediaById = async (id: string): Promise<Media> => {
  return await get<Media>(MEDIA_ENDPOINTS.GET_BY_ID(id));
};

// Upload single file
export const uploadMedia = async (
  file: File,
  onProgress?: (progress: number) => void,
  metadata?: Record<string, any>
): Promise<Media> => {
  return await uploadFile<Media>(MEDIA_ENDPOINTS.UPLOAD, file, onProgress, metadata);
};

// Upload multiple files
export const uploadMultipleMedia = async (
  files: File[],
  onProgress?: (progress: number) => void,
  metadata?: Record<string, any>
): Promise<Media[]> => {
  return await uploadMultipleFiles<Media[]>(MEDIA_ENDPOINTS.UPLOAD_MULTIPLE, files, onProgress, metadata);
};

// Delete media
export const deleteMedia = async (id: string): Promise<void> => {
  await del(MEDIA_ENDPOINTS.DELETE(id));
};

// Update media metadata
export const updateMedia = async (id: string, data: Partial<Media>): Promise<Media> => {
  return await put<Media>(MEDIA_ENDPOINTS.UPDATE(id), data);
};

// Bulk delete media
export const bulkDeleteMedia = async (ids: string[]): Promise<void> => {
  await post(MEDIA_ENDPOINTS.BULK_DELETE, { ids });
};

// Get media stats
export const getMediaStats = async (): Promise<{
  total: number;
  totalSize: number;
  totalSizeMB: string;
  byType: Array<{ _id: string; count: number }>;
  recent: Media[];
}> => {
  return await get(MEDIA_ENDPOINTS.STATS);
};

// Optimize image
export const optimizeMedia = async (id: string, options?: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}): Promise<Media> => {
  return await post(MEDIA_ENDPOINTS.OPTIMIZE(id), options);
};

// Generate thumbnail
export const generateThumbnail = async (id: string, width?: number, height?: number): Promise<{ thumbnailUrl: string }> => {
  return await post(MEDIA_ENDPOINTS.THUMBNAIL(id), { width, height });
};

// Get file download URL
export const getDownloadUrl = (media: Media): string => {
  return media.fileUrl;
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

// Check if file is image
export const isImage = (media: Media): boolean => {
  return media.fileType.startsWith('image/');
};

// Check if file is video
export const isVideo = (media: Media): boolean => {
  return media.fileType.startsWith('video/');
};

// Check if file is PDF
export const isPdf = (media: Media): boolean => {
  return media.fileType === 'application/pdf';
};

// Get file extension
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

// Get file icon based on type
export const getFileIcon = (media: Media): string => {
  if (isImage(media)) return 'image';
  if (isVideo(media)) return 'video';
  if (isPdf(media)) return 'pdf';
  return 'file';
};

export default {
  getMedia,
  getMediaById,
  uploadMedia,
  uploadMultipleMedia,
  deleteMedia,
  updateMedia,
  bulkDeleteMedia,
  getMediaStats,
  optimizeMedia,
  generateThumbnail,
  getDownloadUrl,
  formatFileSize,
  isImage,
  isVideo,
  isPdf,
  getFileExtension,
  getFileIcon
};