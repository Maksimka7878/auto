import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  EXPIRED = 'expired',
  TRIAL = 'trial',
}

export enum PlanType {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

@Schema({ timestamps: true })
export class Subscription {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: PlanType, default: PlanType.FREE })
  plan: PlanType;

  @Prop({ required: true, enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Prop({ default: null })
  stripeSubscriptionId: string;

  @Prop({ default: null })
  stripePriceId: string;

  @Prop({ default: null })
  stripeCustomerId: string;

  @Prop({ default: null })
  currentPeriodStart: Date;

  @Prop({ default: null })
  currentPeriodEnd: Date;

  @Prop({ default: null })
  cancelledAt: Date;

  @Prop({ default: false })
  cancelAtPeriodEnd: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 });
SubscriptionSchema.index({ status: 1 });
