import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExecutionDocument = Execution & Document;

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

export interface StepLog {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

@Schema({ timestamps: true })
export class Execution {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Workflow' })
  workflowId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ default: ExecutionStatus.PENDING, enum: ExecutionStatus })
  status: ExecutionStatus;

  @Prop({ default: null })
  startedAt: Date;

  @Prop({ default: null })
  finishedAt: Date;

  @Prop({ default: 0 })
  duration: number;

  @Prop({ type: Object, default: {} })
  triggerData: Record<string, any>;

  @Prop({ type: [Object], default: [] })
  steps: StepLog[];

  @Prop({ default: null })
  error: string;

  @Prop({ type: Object, default: {} })
  context: Record<string, any>;

  // Retry mechanism fields
  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: 3 })
  maxRetries: number;

  @Prop({ default: null })
  nextRetryAt: Date;

  @Prop({ default: null })
  lastRetryError: string;

  @Prop({ type: Types.ObjectId, ref: 'Execution', default: null })
  parentExecutionId: Types.ObjectId;

  @Prop({ default: false })
  isRetry: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ExecutionSchema = SchemaFactory.createForClass(Execution);

// Indexes
ExecutionSchema.index({ workflowId: 1 });
ExecutionSchema.index({ userId: 1 });
ExecutionSchema.index({ status: 1 });
ExecutionSchema.index({ startedAt: -1 });
ExecutionSchema.index({ createdAt: -1 });
