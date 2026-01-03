import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument, AuditAction, AuditStatus } from './schemas/audit-log.schema';

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  status: AuditStatus;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
  duration?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(entry: AuditLogEntry): Promise<AuditLog> {
    try {
      const auditLog = new this.auditLogModel({
        userId: entry.userId ? new Types.ObjectId(entry.userId) : null,
        action: entry.action,
        status: entry.status,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ? new Types.ObjectId(entry.resourceId) : null,
        metadata: entry.metadata || {},
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        errorMessage: entry.errorMessage,
        duration: entry.duration,
      });

      const saved = await auditLog.save();
      this.logger.debug(`Audit log: ${entry.action} - ${entry.status}`);
      return saved;
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
      throw error;
    }
  }

  async logSuccess(
    action: AuditAction,
    userId?: string,
    options?: Partial<AuditLogEntry>,
  ): Promise<AuditLog> {
    return this.log({
      action,
      status: AuditStatus.SUCCESS,
      userId,
      ...options,
    });
  }

  async logFailure(
    action: AuditAction,
    userId?: string,
    errorMessage?: string,
    options?: Partial<AuditLogEntry>,
  ): Promise<AuditLog> {
    return this.log({
      action,
      status: AuditStatus.FAILURE,
      userId,
      errorMessage,
      ...options,
    });
  }

  async findByUser(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: AuditAction;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const query: any = { userId: new Types.ObjectId(userId) };

    if (options?.action) {
      query.action = options.action;
    }

    if (options?.startDate || options?.endDate) {
      query.createdAt = {};
      if (options.startDate) {
        query.createdAt.$gte = options.startDate;
      }
      if (options.endDate) {
        query.createdAt.$lte = options.endDate;
      }
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.auditLogModel.countDocuments(query),
    ]);

    return { logs, total };
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    return this.auditLogModel
      .find({
        resourceType,
        resourceId: new Types.ObjectId(resourceId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getStats(
    userId: string,
    days: number = 30,
  ): Promise<{
    total: number;
    byAction: Record<string, number>;
    byStatus: Record<string, number>;
    recentActivity: { date: string; count: number }[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.auditLogModel.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byAction: [
            { $group: { _id: '$action', count: { $sum: 1 } } },
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          recentActivity: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const result = stats[0];

    return {
      total: result.total[0]?.count || 0,
      byAction: result.byAction.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id] = item.count;
          return acc;
        },
        {},
      ),
      byStatus: result.byStatus.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id] = item.count;
          return acc;
        },
        {},
      ),
      recentActivity: result.recentActivity.map((item: { _id: string; count: number }) => ({
        date: item._id,
        count: item.count,
      })),
    };
  }

  async deleteOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditLogModel.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    this.logger.log(`Deleted ${result.deletedCount} old audit logs`);
    return result.deletedCount;
  }
}
