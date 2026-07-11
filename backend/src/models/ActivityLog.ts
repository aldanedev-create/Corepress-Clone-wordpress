// backend/src/models/ActivityLog.ts
import mongoose, { Schema, Document } from 'mongoose';

// Activity action types
export type ActivityAction = 
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'REGISTER'
  | 'POST_CREATE' | 'POST_UPDATE' | 'POST_DELETE' | 'POST_PUBLISH_TOGGLE'
  | 'PAGE_CREATE' | 'PAGE_UPDATE' | 'PAGE_DELETE'
  | 'MEDIA_UPLOAD' | 'MEDIA_DELETE' | 'MEDIA_BULK_DELETE'
  | 'CATEGORY_CREATE' | 'CATEGORY_UPDATE' | 'CATEGORY_DELETE'
  | 'USER_CREATE' | 'USER_UPDATE' | 'USER_DELETE' | 'USER_ROLE_CHANGE'
  | 'SETTINGS_UPDATE' | 'SETTINGS_RESET'
  | 'NAVIGATION_UPDATE'
  | 'PASSWORD_CHANGE' | 'PASSWORD_RESET_REQUEST' | 'PASSWORD_RESET_SUCCESS'
  | 'SITEMAP_GENERATE'
  | 'EXPORT_DATA' | 'IMPORT_DATA'
  | 'BACKUP_CREATE' | 'BACKUP_RESTORE'
  | 'PLUGIN_INSTALL' | 'PLUGIN_ACTIVATE' | 'PLUGIN_DEACTIVATE' | 'PLUGIN_UNINSTALL'
  | 'THEME_ACTIVATE' | 'THEME_INSTALL' | 'THEME_DELETE'
  | 'COMMENT_CREATE' | 'COMMENT_UPDATE' | 'COMMENT_DELETE' | 'COMMENT_APPROVE'
  | 'FORM_SUBMIT'
  | 'API_ACCESS'
  | 'ERROR_OCCURRED'
  | 'SYSTEM_MAINTENANCE'
  | 'CLEAR_CACHE';

// Activity log interface
export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId | null;
  action: ActivityAction;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

// Activity log schema
const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: [
        'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'REGISTER',
        'POST_CREATE', 'POST_UPDATE', 'POST_DELETE', 'POST_PUBLISH_TOGGLE',
        'PAGE_CREATE', 'PAGE_UPDATE', 'PAGE_DELETE',
        'MEDIA_UPLOAD', 'MEDIA_DELETE', 'MEDIA_BULK_DELETE',
        'CATEGORY_CREATE', 'CATEGORY_UPDATE', 'CATEGORY_DELETE',
        'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_ROLE_CHANGE',
        'SETTINGS_UPDATE', 'SETTINGS_RESET',
        'NAVIGATION_UPDATE',
        'PASSWORD_CHANGE', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS',
        'SITEMAP_GENERATE',
        'EXPORT_DATA', 'IMPORT_DATA',
        'BACKUP_CREATE', 'BACKUP_RESTORE',
        'PLUGIN_INSTALL', 'PLUGIN_ACTIVATE', 'PLUGIN_DEACTIVATE', 'PLUGIN_UNINSTALL',
        'THEME_ACTIVATE', 'THEME_INSTALL', 'THEME_DELETE',
        'COMMENT_CREATE', 'COMMENT_UPDATE', 'COMMENT_DELETE', 'COMMENT_APPROVE',
        'FORM_SUBMIT',
        'API_ACCESS',
        'ERROR_OCCURRED',
        'SYSTEM_MAINTENANCE',
        'CLEAR_CACHE'
      ]
    },
    details: {
      type: String,
      required: [true, 'Details are required'],
      trim: true,
      maxlength: [2000, 'Details cannot exceed 2000 characters']
    },
    ipAddress: {
      type: String,
      trim: true,
      default: 'unknown'
    },
    userAgent: {
      type: String,
      trim: true,
      default: 'unknown'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      default: 'info'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
ActivityLogSchema.index({ userId: 1 });
ActivityLogSchema.index({ action: 1 });
ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ severity: 1 });
ActivityLogSchema.index({ ipAddress: 1 });
ActivityLogSchema.index({ 'metadata.resourceId': 1 });

// Compound indexes for common queries
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ action: 1, timestamp: -1 });

// Virtual field for formatted timestamp
ActivityLogSchema.virtual('formattedTimestamp').get(function(this: IActivityLog) {
  return this.timestamp.toLocaleString();
});

// Virtual field for user information
ActivityLogSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware
ActivityLogSchema.pre('save', function(next) {
  const log = this as IActivityLog;
  
  // Set timestamp if not set
  if (!log.timestamp) {
    log.timestamp = new Date();
  }
  
  // Set default severity based on action
  if (!log.severity) {
    const criticalActions: ActivityAction[] = [
      'LOGIN_FAILED', 'USER_DELETE', 'ERROR_OCCURRED'
    ];
    const errorActions: ActivityAction[] = [
      'POST_DELETE', 'PAGE_DELETE', 'MEDIA_DELETE', 'CATEGORY_DELETE'
    ];
    
    if (criticalActions.includes(log.action)) {
      log.severity = 'critical';
    } else if (errorActions.includes(log.action)) {
      log.severity = 'error';
    } else {
      log.severity = 'info';
    }
  }
  
  next();
});

// Static method to get recent logs
ActivityLogSchema.statics.getRecent = function(limit: number = 100) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

// Static method to get logs by user
ActivityLogSchema.statics.getByUser = function(userId: string, limit: number = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

// Static method to get logs by action
ActivityLogSchema.statics.getByAction = function(action: string, limit: number = 50) {
  return this.find({ action })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

// Static method to get logs by date range
ActivityLogSchema.statics.getByDateRange = function(
  startDate: Date,
  endDate: Date
) {
  return this.find({
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

// Static method to get logs with severity
ActivityLogSchema.statics.getBySeverity = function(
  severity: string,
  limit: number = 50
) {
  return this.find({ severity })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

// Static method to count logs by action
ActivityLogSchema.statics.countByAction = function() {
  return this.aggregate([
    { $group: { _id: '$action', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get activity summary
ActivityLogSchema.statics.getSummary = async function() {
  const total = await this.countDocuments();
  const recent = await this.find()
    .sort({ timestamp: -1 })
    .limit(10)
    .populate('userId', 'name email');
  
  const bySeverity = await this.aggregate([
    { $group: { _id: '$severity', count: { $sum: 1 } } }
  ]);
  
  const last24Hours = await this.countDocuments({
    timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });
  
  return {
    total,
    recent,
    bySeverity,
    last24Hours
  };
};

// Static method to clean old logs
ActivityLogSchema.statics.cleanOldLogs = async function(daysToKeep: number = 30) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  const result = await this.deleteMany({
    timestamp: { $lt: cutoffDate },
    severity: { $ne: 'critical' }
  });
  return result.deletedCount;
};

// Create and export model
const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
export default ActivityLog;