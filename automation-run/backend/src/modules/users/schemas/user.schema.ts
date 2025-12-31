import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: 'free', enum: ['free', 'pro', 'enterprise'] })
  plan: 'free' | 'pro' | 'enterprise';

  @Prop({ default: null })
  stripeCustomerId: string;

  @Prop({ default: null })
  stripeSubscriptionId: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: null })
  emailVerificationToken: string;

  @Prop({ default: null })
  passwordResetToken: string;

  @Prop({ default: null })
  passwordResetExpires: Date;

  @Prop({ default: null })
  lastLoginAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  settings: {
    notifications: {
      email: boolean;
      telegram: boolean;
    };
    timezone: string;
    language: string;
  };

  @Prop({ type: Object, default: {} })
  usage: {
    workflowsCount: number;
    executionsThisMonth: number;
    storageUsed: number;
    lastResetDate: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ stripeCustomerId: 1 });
UserSchema.index({ createdAt: -1 });
