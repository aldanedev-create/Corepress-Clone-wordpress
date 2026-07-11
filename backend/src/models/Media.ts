// backend/src/models/Media.ts
import mongoose, { Schema, Document } from 'mongoose';

// Media interface
export interface IMedia extends Document {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  publicId: string;
  altText: string;
  width: number;
  height: number;
  format: string;
  uploadedBy: mongoose.Types.ObjectId;
  metadata: Record<string, any>;
  isOptimized: boolean;
  optimizedUrl: string;
  thumbnailUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

// Media schema
const MediaSchema = new Schema<IMedia>(
  {
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters']
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      trim: true,
      lowercase: true
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size must be positive']
    },
    publicId: {
      type: String,
      trim: true
    },
    altText: {
      type: String,
      trim: true,
      maxlength: [200, 'Alt text cannot exceed 200 characters']
    },
    width: {
      type: Number,
      min: 0
    },
    height: {
      type: Number,
      min: 0
    },
    format: {
      type: String,
      trim: true,
      lowercase: true
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required']
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    isOptimized: {
      type: Boolean,
      default: false
    },
    optimizedUrl: {
      type: String,
      trim: true
    },
    thumbnailUrl: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
MediaSchema.index({ fileType: 1 });
MediaSchema.index({ uploadedBy: 1 });
MediaSchema.index({ createdAt: -1 });
MediaSchema.index({ fileName: 'text' });

// Virtual field for file size in MB
MediaSchema.virtual('sizeInMB').get(function(this: IMedia) {
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

// Virtual field for file size in KB
MediaSchema.virtual('sizeInKB').get(function(this: IMedia) {
  return (this.fileSize / 1024).toFixed(2);
});

// Virtual field for file extension
MediaSchema.virtual('extension').get(function(this: IMedia) {
  const parts = this.fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
});

// Virtual field for is image
MediaSchema.virtual('isImage').get(function(this: IMedia) {
  return this.fileType.startsWith('image/');
});

// Virtual field for is video
MediaSchema.virtual('isVideo').get(function(this: IMedia) {
  return this.fileType.startsWith('video/');
});

// Virtual field for is pdf
MediaSchema.virtual('isPdf').get(function(this: IMedia) {
  return this.fileType === 'application/pdf';
});

// Pre-save middleware
MediaSchema.pre('save', function(next) {
  const media = this as IMedia;
  
  // Set default alt text from filename if not provided
  if (!media.altText) {
    media.altText = media.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  }
  
  // If file is image, set format from file type
  if (media.isImage && !media.format) {
    const formats: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg'
    };
    media.format = formats[media.fileType] || '';
  }
  
  next();
});

// Pre-save middleware to update timestamps
MediaSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Static method to get images only
MediaSchema.statics.getImages = function() {
  return this.find({ fileType: { $regex: '^image/' } });
};

// Static method to get videos only
MediaSchema.statics.getVideos = function() {
  return this.find({ fileType: { $regex: '^video/' } });
};

// Static method to get media by type
MediaSchema.statics.findByType = function(fileType: string) {
  return this.find({ fileType: { $regex: fileType, $options: 'i' } });
};

// Static method to get recent uploads
MediaSchema.statics.getRecent = function(limit: number = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Create and export model
const Media = mongoose.model<IMedia>('Media', MediaSchema);
export default Media;