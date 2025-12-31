import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Execution, ExecutionDocument, ExecutionStatus } from '../executions/schemas/execution.schema';
import { Workflow, WorkflowDocument } from '../workflows/schemas/workflow.schema';

export interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  executionsToday: number;
  executionsThisWeek: number;
  executionsThisMonth: number;
  avgExecutionTime: number;
  topWorkflows: { id: string; name: string; executions: number; successRate: number }[];
  recentErrors: { workflowName: string; error: string; timestamp: Date }[];
  executionTrend: { date: string; success: number; error: number }[];
  nodeTypeUsage: { type: string; count: number }[];
}

export interface WorkflowAnalytics {
  workflowId: string;
  name: string;
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  executionsByHour: { hour: number; count: number }[];
  executionsByDay: { day: string; count: number }[];
  commonErrors: { error: string; count: number }[];
  lastExecutions: { id: string; status: string; duration: number; timestamp: Date }[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Execution.name) private executionModel: Model<ExecutionDocument>,
    @InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>,
  ) {}

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const userObjId = new Types.ObjectId(userId);

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      workflowStats,
      executionStats,
      todayExecutions,
      weekExecutions,
      monthExecutions,
      topWorkflows,
      recentErrors,
      executionTrend,
      nodeTypeUsage,
    ] = await Promise.all([
      // Workflow stats
      this.workflowModel.aggregate([
        { $match: { userId: userObjId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
          },
        },
      ]),

      // Execution stats
      this.executionModel.aggregate([
        { $match: { userId: userObjId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            success: { $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.SUCCESS] }, 1, 0] } },
            avgDuration: { $avg: '$duration' },
          },
        },
      ]),

      // Today's executions
      this.executionModel.countDocuments({
        userId: userObjId,
        createdAt: { $gte: todayStart },
      }),

      // Week's executions
      this.executionModel.countDocuments({
        userId: userObjId,
        createdAt: { $gte: weekStart },
      }),

      // Month's executions
      this.executionModel.countDocuments({
        userId: userObjId,
        createdAt: { $gte: monthStart },
      }),

      // Top workflows
      this.executionModel.aggregate([
        { $match: { userId: userObjId } },
        {
          $group: {
            _id: '$workflowId',
            executions: { $sum: 1 },
            success: { $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.SUCCESS] }, 1, 0] } },
          },
        },
        { $sort: { executions: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'workflows',
            localField: '_id',
            foreignField: '_id',
            as: 'workflow',
          },
        },
        { $unwind: '$workflow' },
        {
          $project: {
            id: '$_id',
            name: '$workflow.name',
            executions: 1,
            successRate: {
              $cond: [
                { $gt: ['$executions', 0] },
                { $multiply: [{ $divide: ['$success', '$executions'] }, 100] },
                0,
              ],
            },
          },
        },
      ]),

      // Recent errors
      this.executionModel
        .find({
          userId: userObjId,
          status: ExecutionStatus.ERROR,
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('workflowId', 'name')
        .exec(),

      // Execution trend (last 14 days)
      this.executionModel.aggregate([
        {
          $match: {
            userId: userObjId,
            createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            success: { $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.SUCCESS] }, 1, 0] } },
            error: { $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.ERROR] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Node type usage
      this.workflowModel.aggregate([
        { $match: { userId: userObjId } },
        { $unwind: '$nodes' },
        { $group: { _id: '$nodes.type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { type: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    const wStats = workflowStats[0] || { total: 0, active: 0 };
    const eStats = executionStats[0] || { total: 0, success: 0, avgDuration: 0 };

    return {
      totalWorkflows: wStats.total,
      activeWorkflows: wStats.active,
      totalExecutions: eStats.total,
      successRate: eStats.total > 0 ? (eStats.success / eStats.total) * 100 : 0,
      executionsToday: todayExecutions,
      executionsThisWeek: weekExecutions,
      executionsThisMonth: monthExecutions,
      avgExecutionTime: Math.round(eStats.avgDuration || 0),
      topWorkflows: topWorkflows.map(w => ({
        id: w.id.toString(),
        name: w.name,
        executions: w.executions,
        successRate: Math.round(w.successRate * 100) / 100,
      })),
      recentErrors: recentErrors.map(e => ({
        workflowName: (e.workflowId as any)?.name || 'Unknown',
        error: e.error || 'Unknown error',
        timestamp: e.createdAt,
      })),
      executionTrend: executionTrend.map(t => ({
        date: t._id,
        success: t.success,
        error: t.error,
      })),
      nodeTypeUsage,
    };
  }

  async getWorkflowAnalytics(workflowId: string, userId: string): Promise<WorkflowAnalytics> {
    const workflowObjId = new Types.ObjectId(workflowId);
    const userObjId = new Types.ObjectId(userId);

    const workflow = await this.workflowModel.findOne({
      _id: workflowObjId,
      userId: userObjId,
    }).exec();

    if (!workflow) {
      throw new Error('Workflow не найден');
    }

    const [
      stats,
      executionsByHour,
      executionsByDay,
      commonErrors,
      lastExecutions,
    ] = await Promise.all([
      // Basic stats
      this.executionModel.aggregate([
        { $match: { workflowId: workflowObjId, userId: userObjId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            success: { $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.SUCCESS] }, 1, 0] } },
            error: { $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.ERROR] }, 1, 0] } },
            avgDuration: { $avg: '$duration' },
            minDuration: { $min: '$duration' },
            maxDuration: { $max: '$duration' },
          },
        },
      ]),

      // Executions by hour
      this.executionModel.aggregate([
        {
          $match: {
            workflowId: workflowObjId,
            userId: userObjId,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { hour: '$_id', count: 1, _id: 0 } },
      ]),

      // Executions by day
      this.executionModel.aggregate([
        {
          $match: {
            workflowId: workflowObjId,
            userId: userObjId,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { day: '$_id', count: 1, _id: 0 } },
      ]),

      // Common errors
      this.executionModel.aggregate([
        {
          $match: {
            workflowId: workflowObjId,
            userId: userObjId,
            status: ExecutionStatus.ERROR,
            error: { $ne: null },
          },
        },
        { $group: { _id: '$error', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { error: '$_id', count: 1, _id: 0 } },
      ]),

      // Last executions
      this.executionModel
        .find({ workflowId: workflowObjId, userId: userObjId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('_id status duration createdAt')
        .exec(),
    ]);

    const s = stats[0] || {
      total: 0,
      success: 0,
      error: 0,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
    };

    return {
      workflowId,
      name: workflow.name,
      totalExecutions: s.total,
      successCount: s.success,
      errorCount: s.error,
      successRate: s.total > 0 ? (s.success / s.total) * 100 : 0,
      avgDuration: Math.round(s.avgDuration || 0),
      minDuration: s.minDuration || 0,
      maxDuration: s.maxDuration || 0,
      executionsByHour,
      executionsByDay,
      commonErrors,
      lastExecutions: lastExecutions.map(e => ({
        id: e._id.toString(),
        status: e.status,
        duration: e.duration,
        timestamp: e.createdAt,
      })),
    };
  }
}
