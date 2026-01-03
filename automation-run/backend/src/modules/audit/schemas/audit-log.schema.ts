import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

export enum AuditAction {
  // Auth
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  REGISTER = 'auth.register',
  PASSWORD_CHANGE = 'auth.password_change',
  PASSWORD_RESET = 'auth.password_reset',
  EMAIL_VERIFIED = 'auth.email_verified',

  // Workflows
  WORKFLOW_CREATE = 'workflow.create',
  WORKFLOW_UPDATE = 'workflow.update',
  WORKFLOW_DELETE = 'workflow.delete',
  WORKFLOW_ACTIVATE = 'workflow.activate',
  WORKFLOW_DEACTIVATE = 'workflow.deactivate',
  WORKFLOW_DUPLICATE = 'workflow.duplicate',

  // Executions
  EXECUTION_START = 'execution.start',
  EXECUTION_COMPLETE = 'execution.complete',
  EXECUTION_ERROR = 'execution.error',
  EXECUTION_CANCEL = 'execution.cancel',

  // Subscriptions
  SUBSCRIPTION_UPGRADE = 'subscription.upgrade',
  SUBSCRIPTION_DOWNGRADE = 'subscription.downgrade',
  SUBSCRIPTION_CANCEL = 'subscription.cancel',

  // User
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  SETTINGS_UPDATE = 'user.settings_update',

  // Integrations
  INTEGRATION_CONNECT = 'integration.connect',
  INTEGRATION_DISCONNECT = 'integration.disconnect',

  // API
  API_KEY_CREATE = 'api.key_create',
  API_KEY_REVOKE = 'api.key_revoke',
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  WARNING = 'warning',
}

@Schema({ timestamps: true })
export class AuditLog {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(AuditAction), index: true })
  action: AuditAction;

  @Prop({ required: true, enum: Object.values(AuditStatus) })
  status: AuditStatus;

  @Prop({ type: String })
  resourceType: string;

  @Prop({ type: Types.ObjectId })
  resourceId: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: String })
  ipAddress: string;

  @Prop({ type: String })
  userAgent: string;

  @Prop({ type: String })
  errorMessage: string;

  @Prop({ type: Number })
  duration: number;

  createdAt: Date;
  updatedAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });
AuditLogSchema.index({ createdAt: -1 });

// TTL index - auto-delete logs older than 90 days
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
