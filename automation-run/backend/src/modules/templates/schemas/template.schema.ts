import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WorkflowNode, NodeConnection } from '../../workflows/schemas/workflow.schema';

export type TemplateDocument = Template & Document;

export enum TemplateCategory {
  MARKETING = 'marketing',
  SALES = 'sales',
  SUPPORT = 'support',
  HR = 'hr',
  DEVELOPMENT = 'development',
  NOTIFICATIONS = 'notifications',
  DATA_SYNC = 'data_sync',
  SOCIAL_MEDIA = 'social_media',
  E_COMMERCE = 'e_commerce',
  CUSTOM = 'custom',
}

@Schema({ timestamps: true })
export class Template {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: TemplateCategory })
  category: TemplateCategory;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [Object], default: [] })
  nodes: WorkflowNode[];

  @Prop({ type: [Object], default: [] })
  connections: NodeConnection[];

  @Prop({ type: Object, default: {} })
  variables: Record<string, any>;

  @Prop({ default: '' })
  iconUrl: string;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ default: true })
  isPublic: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId;

  @Prop({ default: 'beginner', enum: ['beginner', 'intermediate', 'advanced'] })
  difficulty: string;

  @Prop({ default: 0 })
  estimatedSetupTime: number; // in minutes

  @Prop({ type: [String], default: [] })
  requiredIntegrations: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);

// Indexes
TemplateSchema.index({ category: 1 });
TemplateSchema.index({ tags: 1 });
TemplateSchema.index({ isPublic: 1 });
TemplateSchema.index({ isFeatured: 1 });
TemplateSchema.index({ usageCount: -1 });
TemplateSchema.index({ name: 'text', description: 'text' });
