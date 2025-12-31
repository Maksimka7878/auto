import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = new this.userModel({
      ...createUserDto,
      usage: {
        workflowsCount: 0,
        executionsThisMonth: 0,
        storageUsed: 0,
        lastResetDate: new Date(),
      },
      settings: {
        notifications: {
          email: true,
          telegram: false,
        },
        timezone: 'Europe/Moscow',
        language: 'ru',
      },
    });
    return user.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-password').exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { lastLoginAt: new Date() });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { password: hashedPassword });
  }

  async updatePlan(id: string, plan: string, stripeSubscriptionId?: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { plan, stripeSubscriptionId },
        { new: true },
      )
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  async updateStripeCustomerId(id: string, stripeCustomerId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { stripeCustomerId });
  }

  async incrementWorkflowCount(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      $inc: { 'usage.workflowsCount': 1 },
    });
  }

  async decrementWorkflowCount(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      $inc: { 'usage.workflowsCount': -1 },
    });
  }

  async incrementExecutionCount(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      $inc: { 'usage.executionsThisMonth': 1 },
    });
  }

  async resetMonthlyExecutions(): Promise<void> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    await this.userModel.updateMany(
      { 'usage.lastResetDate': { $lt: startOfMonth } },
      {
        'usage.executionsThisMonth': 0,
        'usage.lastResetDate': new Date(),
      },
    );
  }

  async getUserStats(id: string): Promise<{
    workflowsCount: number;
    executionsThisMonth: number;
    storageUsed: number;
    plan: string;
    limits: {
      workflowsLimit: number;
      executionsLimit: number;
      storageLimit: number;
    };
  }> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const planLimits = {
      free: { workflowsLimit: 3, executionsLimit: 100, storageLimit: 100 },
      pro: { workflowsLimit: 50, executionsLimit: 10000, storageLimit: 10240 },
      enterprise: { workflowsLimit: -1, executionsLimit: -1, storageLimit: -1 },
    };

    return {
      workflowsCount: user.usage?.workflowsCount || 0,
      executionsThisMonth: user.usage?.executionsThisMonth || 0,
      storageUsed: user.usage?.storageUsed || 0,
      plan: user.plan,
      limits: planLimits[user.plan] || planLimits.free,
    };
  }

  async delete(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Пользователь не найден');
    }
  }
}
