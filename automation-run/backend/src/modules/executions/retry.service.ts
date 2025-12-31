import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Model, Types } from 'mongoose';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Execution, ExecutionDocument, ExecutionStatus } from './schemas/execution.schema';
import { Workflow, WorkflowDocument } from '../workflows/schemas/workflow.schema';

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  constructor(
    @InjectModel(Execution.name) private executionModel: Model<ExecutionDocument>,
    @InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>,
    @InjectQueue('executions') private executionsQueue: Queue,
  ) {}

  calculateNextRetryDelay(
    retryCount: number,
    initialDelayMs: number,
    maxDelayMs: number,
    backoffMultiplier: number,
  ): number {
    // Exponential backoff with jitter
    const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, retryCount);
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
    // Add 10% jitter to prevent thundering herd
    const jitter = cappedDelay * 0.1 * Math.random();
    return Math.floor(cappedDelay + jitter);
  }

  async scheduleRetry(executionId: string): Promise<boolean> {
    const execution = await this.executionModel.findById(executionId).exec();
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found for retry`);
      return false;
    }

    const workflow = await this.workflowModel.findById(execution.workflowId).exec();
    if (!workflow) {
      this.logger.warn(`Workflow ${execution.workflowId} not found for retry`);
      return false;
    }

    // Check if retries are enabled and limit not reached
    const workflowAny = workflow as any;
    if (!workflowAny.retryEnabled) {
      this.logger.debug(`Retries disabled for workflow ${workflow._id}`);
      return false;
    }

    const maxRetries = workflowAny.maxRetries || 3;
    if (execution.retryCount >= maxRetries) {
      this.logger.debug(`Max retries (${maxRetries}) reached for execution ${executionId}`);
      return false;
    }

    // Calculate delay
    const delay = this.calculateNextRetryDelay(
      execution.retryCount,
      workflowAny.retryInitialDelayMs || 1000,
      workflowAny.retryMaxDelayMs || 60000,
      workflowAny.retryBackoffMultiplier || 2,
    );

    const nextRetryAt = new Date(Date.now() + delay);

    // Update execution with retry info
    await this.executionModel.findByIdAndUpdate(executionId, {
      nextRetryAt,
      lastRetryError: execution.error,
      $inc: { retryCount: 1 },
    }).exec();

    // Schedule the retry job
    await this.executionsQueue.add(
      'retry',
      {
        executionId: executionId,
        workflowId: workflow._id.toString(),
        userId: execution.userId.toString(),
        triggerData: execution.triggerData,
        retryCount: execution.retryCount + 1,
      },
      { delay },
    );

    this.logger.log(
      `Scheduled retry ${execution.retryCount + 1}/${maxRetries} for execution ${executionId} in ${delay}ms`
    );

    return true;
  }

  async createRetryExecution(
    originalExecutionId: string,
    workflowId: string,
    userId: string,
    triggerData: Record<string, any>,
    retryCount: number,
  ): Promise<Execution> {
    const retryExecution = new this.executionModel({
      workflowId: new Types.ObjectId(workflowId),
      userId: new Types.ObjectId(userId),
      triggerData,
      status: ExecutionStatus.PENDING,
      retryCount,
      isRetry: true,
      parentExecutionId: new Types.ObjectId(originalExecutionId),
    });

    return retryExecution.save();
  }

  // Process pending retries every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingRetries(): Promise<void> {
    const now = new Date();

    // Find executions that are due for retry
    const pendingRetries = await this.executionModel.find({
      status: ExecutionStatus.ERROR,
      nextRetryAt: { $lte: now },
      retryCount: { $lt: 3 }, // Default max retries
    }).limit(50).exec();

    for (const execution of pendingRetries) {
      try {
        // Clear nextRetryAt to prevent double processing
        await this.executionModel.findByIdAndUpdate(execution._id, {
          nextRetryAt: null,
        }).exec();

        // Queue the retry
        await this.executionsQueue.add('retry', {
          executionId: execution._id.toString(),
          workflowId: execution.workflowId.toString(),
          userId: execution.userId.toString(),
          triggerData: execution.triggerData,
          retryCount: execution.retryCount,
        });

        this.logger.debug(`Processed pending retry for execution ${execution._id}`);
      } catch (error) {
        this.logger.error(`Failed to process retry for execution ${execution._id}: ${error}`);
      }
    }
  }

  async getRetryHistory(executionId: string): Promise<Execution[]> {
    // Get all retries for an execution (including the original)
    const execution = await this.executionModel.findById(executionId).exec();
    if (!execution) {
      return [];
    }

    // If this is a retry, find the parent
    const parentId = execution.parentExecutionId || execution._id;

    return this.executionModel
      .find({
        $or: [
          { _id: parentId },
          { parentExecutionId: parentId },
        ],
      })
      .sort({ createdAt: 1 })
      .exec();
  }
}
