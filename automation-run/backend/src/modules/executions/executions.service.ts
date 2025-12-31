import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Execution, ExecutionDocument, ExecutionStatus, StepLog } from './schemas/execution.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class ExecutionsService {
  constructor(
    @InjectModel(Execution.name) private executionModel: Model<ExecutionDocument>,
    private usersService: UsersService,
  ) {}

  async create(workflowId: string, userId: string, triggerData?: Record<string, any>): Promise<Execution> {
    // Check execution limits
    const userStats = await this.usersService.getUserStats(userId);
    if (userStats.limits.executionsLimit !== -1 &&
        userStats.executionsThisMonth >= userStats.limits.executionsLimit) {
      throw new ForbiddenException(
        `Достигнут лимит выполнений (${userStats.limits.executionsLimit}) для вашего тарифа`
      );
    }

    const execution = new this.executionModel({
      workflowId: new Types.ObjectId(workflowId),
      userId: new Types.ObjectId(userId),
      triggerData: triggerData || {},
      status: ExecutionStatus.PENDING,
    });

    const saved = await execution.save();

    // Increment execution count
    await this.usersService.incrementExecutionCount(userId);

    return saved;
  }

  async start(id: string): Promise<Execution> {
    return this.executionModel
      .findByIdAndUpdate(
        id,
        {
          status: ExecutionStatus.RUNNING,
          startedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async addStepLog(id: string, step: StepLog): Promise<void> {
    await this.executionModel.findByIdAndUpdate(id, {
      $push: { steps: step },
    });
  }

  async updateStepLog(id: string, nodeId: string, updates: Partial<StepLog>): Promise<void> {
    await this.executionModel.findByIdAndUpdate(id, {
      $set: {
        'steps.$[elem].status': updates.status,
        'steps.$[elem].finishedAt': updates.finishedAt,
        'steps.$[elem].duration': updates.duration,
        'steps.$[elem].output': updates.output,
        'steps.$[elem].error': updates.error,
      },
    }, {
      arrayFilters: [{ 'elem.nodeId': nodeId }],
    });
  }

  async complete(id: string, success: boolean, error?: string): Promise<Execution> {
    const finishedAt = new Date();
    const execution = await this.executionModel.findById(id);

    const duration = execution.startedAt
      ? finishedAt.getTime() - execution.startedAt.getTime()
      : 0;

    return this.executionModel
      .findByIdAndUpdate(
        id,
        {
          status: success ? ExecutionStatus.SUCCESS : ExecutionStatus.ERROR,
          finishedAt,
          duration,
          error,
        },
        { new: true },
      )
      .exec();
  }

  async findAll(userId: string, options?: {
    workflowId?: string;
    status?: ExecutionStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ executions: Execution[]; total: number; page: number; pages: number }> {
    const query: any = { userId: new Types.ObjectId(userId) };

    if (options?.workflowId) {
      query.workflowId = new Types.ObjectId(options.workflowId);
    }
    if (options?.status) {
      query.status = options.status;
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

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      this.executionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('workflowId', 'name')
        .exec(),
      this.executionModel.countDocuments(query),
    ]);

    return {
      executions,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, userId: string): Promise<Execution> {
    const execution = await this.executionModel
      .findById(id)
      .populate('workflowId', 'name nodes')
      .exec();

    if (!execution) {
      throw new NotFoundException('Выполнение не найдено');
    }

    if (execution.userId.toString() !== userId) {
      throw new ForbiddenException('Доступ запрещен');
    }

    return execution;
  }

  async getStats(userId: string, workflowId?: string): Promise<{
    total: number;
    success: number;
    error: number;
    running: number;
    avgDuration: number;
  }> {
    const match: any = { userId: new Types.ObjectId(userId) };
    if (workflowId) {
      match.workflowId = new Types.ObjectId(workflowId);
    }

    const stats = await this.executionModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: {
            $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.SUCCESS] }, 1, 0] },
          },
          error: {
            $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.ERROR] }, 1, 0] },
          },
          running: {
            $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.RUNNING] }, 1, 0] },
          },
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        total: 0,
        success: 0,
        error: 0,
        running: 0,
        avgDuration: 0,
      };
    }

    return {
      total: stats[0].total,
      success: stats[0].success,
      error: stats[0].error,
      running: stats[0].running,
      avgDuration: Math.round(stats[0].avgDuration || 0),
    };
  }

  async getActivityStats(userId: string, days: number = 30): Promise<{
    date: string;
    success: number;
    error: number;
  }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.executionModel.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          success: {
            $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.SUCCESS] }, 1, 0] },
          },
          error: {
            $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.ERROR] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return stats.map(s => ({
      date: s._id,
      success: s.success,
      error: s.error,
    }));
  }

  async cancel(id: string, userId: string): Promise<Execution> {
    const execution = await this.findById(id, userId);

    if (execution.status !== ExecutionStatus.RUNNING) {
      throw new ForbiddenException('Можно отменить только выполняющиеся процессы');
    }

    return this.executionModel
      .findByIdAndUpdate(
        id,
        {
          status: ExecutionStatus.CANCELLED,
          finishedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }
}
