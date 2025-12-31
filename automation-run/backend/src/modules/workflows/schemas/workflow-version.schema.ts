import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WorkflowNode, NodeConnection } from './workflow.schema';

export type WorkflowVersionDocument = WorkflowVersion & Document;

@Schema({ timestamps: true })
export class WorkflowVersion {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Workflow' })
  workflowId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  version: number;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [Object], default: [] })
  nodes: WorkflowNode[];

  @Prop({ type: [Object], default: [] })
  connections: NodeConnection[];

  @Prop({ type: Object, default: {} })
  variables: Record<string, any>;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: '' })
  changeDescription: string;

  @Prop({ default: false })
  isPublished: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const WorkflowVersionSchema = SchemaFactory.createForClass(WorkflowVersion);

// Indexes
WorkflowVersionSchema.index({ workflowId: 1, version: -1 });
WorkflowVersionSchema.index({ workflowId: 1, createdAt: -1 });
