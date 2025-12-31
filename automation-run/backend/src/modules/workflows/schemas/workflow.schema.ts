import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkflowDocument = Workflow & Document;

// Node types
export enum NodeType {
  // Triggers
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',
  EMAIL_RECEIVED = 'email_received',
  FORM_SUBMISSION = 'form_submission',

  // Actions
  SEND_EMAIL = 'send_email',
  SEND_TELEGRAM = 'send_telegram',
  SEND_SLACK = 'send_slack',
  HTTP_REQUEST = 'http_request',
  GOOGLE_SHEETS = 'google_sheets',
  DATABASE = 'database',

  // Logic
  IF_ELSE = 'if_else',
  DELAY = 'delay',
  LOOP = 'loop',
  TRANSFORM = 'transform',
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  position: NodePosition;
  config: Record<string, any>;
  inputs?: string[];
  outputs?: string[];
}

@Schema({ timestamps: true })
export class Workflow {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [Object], default: [] })
  nodes: WorkflowNode[];

  @Prop({ type: [Object], default: [] })
  connections: NodeConnection[];

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ default: 'draft', enum: ['draft', 'active', 'paused', 'error'] })
  status: string;

  @Prop({ default: null })
  webhookUrl: string;

  @Prop({ default: null })
  webhookSecret: string;

  @Prop({ default: null })
  scheduleExpression: string;

  @Prop({ default: null })
  lastExecutedAt: Date;

  @Prop({ default: 0 })
  executionCount: number;

  @Prop({ default: 0 })
  successCount: number;

  @Prop({ default: 0 })
  errorCount: number;

  @Prop({ type: Object, default: {} })
  variables: Record<string, any>;

  @Prop({ type: [String], default: [] })
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const WorkflowSchema = SchemaFactory.createForClass(Workflow);

// Indexes
WorkflowSchema.index({ userId: 1 });
WorkflowSchema.index({ isActive: 1 });
WorkflowSchema.index({ status: 1 });
WorkflowSchema.index({ webhookUrl: 1 });
WorkflowSchema.index({ createdAt: -1 });
