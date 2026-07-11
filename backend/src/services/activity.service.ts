// backend/src/services/activity.service.ts
import ActivityLog, { IActivityLog, ActivityAction } from '../models/ActivityLog';
import { AppError } from '../middleware/error.middleware';

// Activity service interface
export interface IActivityService {
  log(data: LogData): Promise<IActivityLog>;
  getRecentLogs(limit?: number): Promise<IActivityLog[]>;
  getLogsByUser(userId: string, limit?: number): Promise<IActivityLog[]>;
  getLogsByAction(action: string, limit?: number): Promise<IActivityLog[]>;
  getLogsByDateRange(startDate: Date, endDate: Date): Promise<IActivityLog[]>;
  getLogsBySeverity(severity: string, limit?: number): Promise<IActivityLog[]>;
  getActivitySummary(): Promise<any>;
  cleanOldLogs(daysToKeep?: number): Promise<number>;
  searchLogs(query: SearchLogsOptions): Promise<{ logs: IActivityLog[]; total: number }>;
  getActivityStats(): Promise<any>;
  getUserActivityTimeline(userId: string): Promise<any>;
}

// Types
export interface LogData {
  userId?: string | null;
  action: ActivityAction;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface SearchLogsOptions {
  page?: number;
  limit?: number;
  search?: string;
  action?: ActivityAction;
  userId?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Activity service implementation
class ActivityService implements IActivityService {
  private static instance: ActivityService;

  private constructor() {}

  public static getInstance(): ActivityService {
    if (!ActivityService.instance) {
      ActivityService.instance = new ActivityService();
    }
    return ActivityService.instance;
  }

  // Log activity
  async log(data: LogData): Promise<IActivityLog> {
    try {
      const {
        userId = null,
        action,
        details,
        ipAddress = 'unknown',
        userAgent = 'unknown',
        metadata = {},
        severity = 'info'
      } = data;

      // Validate data
      if (!action) {
        throw new AppError('Action is required', 400);
      }

      if (!details) {
        throw new AppError('Details are required', 400);
      }

      // Create log
      const log = await ActivityLog.create({
        userId,
        action,
        details,
        ipAddress,
        userAgent,
        metadata,
        severity,
        timestamp: new Date()
      });

      return log;
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error - logging should not break the application
      return null as any;
    }
  }

  // Get recent logs
  async getRecentLogs(limit: number = 100): Promise<IActivityLog[]> {
    try {
      return await ActivityLog.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('userId', 'name email')
        .lean();
    } catch (error) {
      throw error;
    }
  }

  // Get logs by user
  async getLogsByUser(userId: string, limit: number = 50): Promise<IActivityLog[]> {
    try {
      return await ActivityLog.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('userId', 'name email')
        .lean();
    } catch (error) {
      throw error;
    }
  }

  // Get logs by action
  async getLogsByAction(action: string, limit: number = 50): Promise<IActivityLog[]> {
    try {
      return await ActivityLog.find({ action })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('userId', 'name email')
        .lean();
    } catch (error) {
      throw error;
    }
  }

  // Get logs by date range
  async getLogsByDateRange(startDate: Date, endDate: Date): Promise<IActivityLog[]> {
    try {
      return await ActivityLog.find({
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      })
        .sort({ timestamp: -1 })
        .populate('userId', 'name email')
        .lean();
    } catch (error) {
      throw error;
    }
  }

  // Get logs by severity
  async getLogsBySeverity(severity: string, limit: number = 50): Promise<IActivityLog[]> {
    try {
      return await ActivityLog.find({ severity })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('userId', 'name email')
        .lean();
    } catch (error) {
      throw error;
    }
  }

  // Get activity summary
  async getActivitySummary(): Promise<any> {
    try {
      const total = await ActivityLog.countDocuments();
      const recent = await ActivityLog.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('userId', 'name email')
        .lean();

      const bySeverity = await ActivityLog.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]);

      const byAction = await ActivityLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      const last24Hours = await ActivityLog.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      const last7Days = await ActivityLog.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      return {
        total,
        recent,
        bySeverity,
        byAction,
        last24Hours,
        last7Days
      };
    } catch (error) {
      throw error;
    }
  }

  // Clean old logs
  async cleanOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      // Don't delete critical logs
      const result = await ActivityLog.deleteMany({
        timestamp: { $lt: cutoffDate },
        severity: { $ne: 'critical' }
      });

      return result.deletedCount;
    } catch (error) {
      throw error;
    }
  }

  // Search logs
  async searchLogs(options: SearchLogsOptions = {}): Promise<{ logs: IActivityLog[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        action,
        userId,
        severity,
        startDate,
        endDate,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};

      if (search) {
        filter.$or = [
          { details: { $regex: search, $options: 'i' } },
          { ipAddress: { $regex: search, $options: 'i' } }
        ];
      }

      if (action) {
        filter.action = action;
      }

      if (userId) {
        filter.userId = userId;
      }

      if (severity) {
        filter.severity = severity;
      }

      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) {
          filter.timestamp.$gte = startDate;
        }
        if (endDate) {
          filter.timestamp.$lte = endDate;
        }
      }

      // Sort
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const [logs, total] = await Promise.all([
        ActivityLog.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('userId', 'name email')
          .lean(),
        ActivityLog.countDocuments(filter)
      ]);

      return { logs, total };
    } catch (error) {
      throw error;
    }
  }

  // Get activity statistics
  async getActivityStats(): Promise<any> {
    try {
      const [total, byDay, byHour, uniqueUsers] = await Promise.all([
        ActivityLog.countDocuments(),
        ActivityLog.aggregate([
          {
            $group: {
              _id: {
                year: { $year: '$timestamp' },
                month: { $month: '$timestamp' },
                day: { $dayOfMonth: '$timestamp' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
          { $limit: 30 }
        ]),
        ActivityLog.aggregate([
          {
            $group: {
              _id: { hour: { $hour: '$timestamp' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.hour': 1 } }
        ]),
        ActivityLog.aggregate([
          { $group: { _id: '$userId' } },
          { $count: 'total' }
        ])
      ]);

      return {
        total,
        byDay,
        byHour,
        uniqueUsers: uniqueUsers[0]?.total || 0
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user activity timeline
  async getUserActivityTimeline(userId: string): Promise<any> {
    try {
      const logs = await ActivityLog.find({ userId })
        .sort({ timestamp: 1 })
        .lean();

      // Group by date
      const timeline: Record<string, any[]> = {};
      
      for (const log of logs) {
        const date = log.timestamp.toISOString().split('T')[0];
        if (!timeline[date]) {
          timeline[date] = [];
        }
        timeline[date].push({
          time: log.timestamp.toLocaleTimeString(),
          action: log.action,
          details: log.details,
          severity: log.severity
        });
      }

      return timeline;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const ActivityLogService = ActivityService.getInstance();
export default ActivityLogService;