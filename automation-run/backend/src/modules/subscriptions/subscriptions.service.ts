import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Subscription, SubscriptionDocument, SubscriptionStatus, PlanType } from './schemas/subscription.schema';
import { UsersService } from '../users/users.service';

export interface PlanDetails {
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    workflows: number;
    executions: number;
    storage: number;
  };
}

@Injectable()
export class SubscriptionsService {
  private plans: Record<PlanType, PlanDetails>;

  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    this.plans = {
      [PlanType.FREE]: {
        name: 'Free',
        price: 0,
        currency: 'RUB',
        interval: 'month',
        features: [
          '3 автоматизации',
          '100 выполнений/месяц',
          'Базовые триггеры',
          'Базовые действия',
          'Email поддержка',
        ],
        limits: { workflows: 3, executions: 100, storage: 100 },
      },
      [PlanType.PRO]: {
        name: 'Pro',
        price: 1990,
        currency: 'RUB',
        interval: 'month',
        features: [
          '50 автоматизаций',
          '10 000 выполнений/месяц',
          'Все триггеры',
          'Все действия',
          'Продвинутая логика',
          'Приоритетная поддержка',
          '10 ГБ хранилища',
        ],
        limits: { workflows: 50, executions: 10000, storage: 10240 },
      },
      [PlanType.ENTERPRISE]: {
        name: 'Enterprise',
        price: 9990,
        currency: 'RUB',
        interval: 'month',
        features: [
          'Безлимитные автоматизации',
          'Безлимитные выполнения',
          'Все возможности',
          'Кастомные интеграции',
          'SLA 99.9%',
          'Выделенная поддержка',
          'Безлимитное хранилище',
          'On-premise развертывание',
        ],
        limits: { workflows: -1, executions: -1, storage: -1 },
      },
    };
  }

  async create(userId: string, plan: PlanType = PlanType.FREE): Promise<Subscription> {
    const subscription = new this.subscriptionModel({
      userId: new Types.ObjectId(userId),
      plan,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    return subscription.save();
  }

  async findByUserId(userId: string): Promise<Subscription | null> {
    return this.subscriptionModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
  }

  async getPlans(): Promise<Record<PlanType, PlanDetails>> {
    return this.plans;
  }

  async getPlanDetails(plan: PlanType): Promise<PlanDetails> {
    return this.plans[plan];
  }

  async getCurrentSubscription(userId: string): Promise<{
    subscription: Subscription;
    plan: PlanDetails;
    usage: any;
  }> {
    let subscription = await this.findByUserId(userId);

    if (!subscription) {
      subscription = await this.create(userId, PlanType.FREE);
    }

    const plan = this.plans[subscription.plan];
    const usage = await this.usersService.getUserStats(userId);

    return {
      subscription,
      plan,
      usage,
    };
  }

  async updatePlan(userId: string, newPlan: PlanType, stripeData?: {
    subscriptionId: string;
    customerId: string;
    priceId: string;
  }): Promise<Subscription> {
    const subscription = await this.findByUserId(userId);

    if (!subscription) {
      throw new NotFoundException('Подписка не найдена');
    }

    const updateData: any = {
      plan: newPlan,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    if (stripeData) {
      updateData.stripeSubscriptionId = stripeData.subscriptionId;
      updateData.stripeCustomerId = stripeData.customerId;
      updateData.stripePriceId = stripeData.priceId;
    }

    const updated = await this.subscriptionModel
      .findByIdAndUpdate(subscription._id, updateData, { new: true })
      .exec();

    // Update user plan
    await this.usersService.updatePlan(userId, newPlan, stripeData?.subscriptionId);

    return updated;
  }

  async cancelSubscription(userId: string, immediately: boolean = false): Promise<Subscription> {
    const subscription = await this.findByUserId(userId);

    if (!subscription) {
      throw new NotFoundException('Подписка не найдена');
    }

    const updateData: any = {
      cancelledAt: new Date(),
      cancelAtPeriodEnd: !immediately,
    };

    if (immediately) {
      updateData.status = SubscriptionStatus.CANCELLED;
      updateData.plan = PlanType.FREE;

      // Downgrade user to free
      await this.usersService.updatePlan(userId, 'free');
    }

    return this.subscriptionModel
      .findByIdAndUpdate(subscription._id, updateData, { new: true })
      .exec();
  }

  async handleStripeWebhook(event: any): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
    }
  }

  private async handleSubscriptionUpdate(stripeSubscription: any): Promise<void> {
    const subscription = await this.subscriptionModel.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (subscription) {
      await this.subscriptionModel.findByIdAndUpdate(subscription._id, {
        status: stripeSubscription.status === 'active'
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.PAST_DUE,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      });
    }
  }

  private async handleSubscriptionCancelled(stripeSubscription: any): Promise<void> {
    const subscription = await this.subscriptionModel.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (subscription) {
      await this.subscriptionModel.findByIdAndUpdate(subscription._id, {
        status: SubscriptionStatus.CANCELLED,
        plan: PlanType.FREE,
      });

      await this.usersService.updatePlan(subscription.userId.toString(), 'free');
    }
  }

  private async handlePaymentSuccess(invoice: any): Promise<void> {
    // Log successful payment
    console.log('Payment succeeded for invoice:', invoice.id);
  }

  private async handlePaymentFailed(invoice: any): Promise<void> {
    const subscription = await this.subscriptionModel.findOne({
      stripeSubscriptionId: invoice.subscription,
    });

    if (subscription) {
      await this.subscriptionModel.findByIdAndUpdate(subscription._id, {
        status: SubscriptionStatus.PAST_DUE,
      });
    }
  }
}
