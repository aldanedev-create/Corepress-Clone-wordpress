// admin/src/types/media.types.ts

// Media interface
export interface Media {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  publicId: string;
  altText: string;
  width?: number;
  height?: number;
  format?: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  metadata: Record<string, any>;
  isOptimized: boolean;
  optimizedUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Media filters for listing
export interface MediaFilters {
  page?: number;
  limit?: number;
  fileType?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Media upload options
export interface MediaUploadOptions {
  folder?: string;
  optimize?: boolean;
  generateThumbnail?: boolean;
  altText?: string;
  metadata?: Record<string, any>;
}

// Image optimization options
export interface ImageOptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  crop?: 'cover' | 'contain' | 'fill';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

// Media statistics
export interface MediaStats {
  total: number;
  totalSize: number;
  totalSizeMB: string;
  byType: Array<{
    _id: string;
    count: number;
    totalSize: number;
  }>;
  byDay: Array<{
    date: string;
    count: number;
  }>;
  recent: Media[];
}

// File type categories
export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

// Get file category from MIME type
export const getFileCategory = (mimeType: string): FileCategory => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf' || mimeType === 'application/msword' || 
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'document';
  }
  if (mimeType === 'application/zip' || mimeType === 'application/x-rar-compressed') {
    return 'archive';
  }
  return 'other';
};

// Get file icon name
export const getFileIconName = (mimeType: string): string => {
  const category = getFileCategory(mimeType);
  const icons: Record<FileCategory, string> = {
    image: 'Image',
    video: 'Video',
    audio: 'Music',
    document: 'FileText',
    archive: 'Archive',
    other: 'File'
  };
  return icons[category] || 'File';
};

// Check if file is image
export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

// Check if file is video
export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

// Check if file is audio
export const isAudioFile = (mimeType: string): boolean => {
  return mimeType.startsWith('audio/');
};

// Check if file is document
export const isDocumentFile = (mimeType: string): boolean => {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  return documentTypes.includes(mimeType);
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
};

// Get file extension
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

// Get file name without extension
export const getFileNameWithoutExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
};

// Generate alt text from filename
export const generateAltText = (filename: string): string => {
  return getFileNameWithoutExtension(filename)
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Check if media is optimized
export const isMediaOptimized = (media: Media): boolean => {
  return media.isOptimized && !!media.optimizedUrl;
};

// Check if media has thumbnail
export const hasThumbnail = (media: Media): boolean => {
  return !!media.thumbnailUrl;
};

// Get optimized URL with fallback
export const getOptimizedUrl = (media: Media): string => {
  return media.optimizedUrl || media.fileUrl;
};

// Get thumbnail URL with fallback
export const getThumbnailUrl = (media: Media): string => {
  return media.thumbnailUrl || media.fileUrl;
};