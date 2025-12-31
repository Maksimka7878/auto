import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Payment, PaymentDocument, PaymentStatus, PaymentProvider } from './schemas/payment.schema';
import { UsersService } from '../users/users.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlanType } from '../subscriptions/schemas/subscription.schema';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private configService: ConfigService,
    private usersService: UsersService,
    private subscriptionsService: SubscriptionsService,
  ) {
    const stripeKey = this.configService.get<string>('stripe.secretKey');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    }
  }

  async createCheckoutSession(userId: string, plan: PlanType): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Платежная система не настроена');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const planDetails = await this.subscriptionsService.getPlanDetails(plan);

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      customerId = customer.id;
      await this.usersService.updateStripeCustomerId(userId, customerId);
    }

    // Create checkout session
    const priceId = this.configService.get<string>(`stripe.priceIds.${plan}`);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${this.configService.get<string>('frontend.url')}/dashboard/subscription?success=true`,
      cancel_url: `${this.configService.get<string>('frontend.url')}/dashboard/subscription?cancelled=true`,
      metadata: {
        userId,
        plan,
      },
    });

    // Create payment record
    await this.paymentModel.create({
      userId: new Types.ObjectId(userId),
      amount: planDetails.price,
      currency: planDetails.currency,
      status: PaymentStatus.PENDING,
      provider: PaymentProvider.STRIPE,
      providerPaymentId: session.id,
      providerCustomerId: customerId,
      description: `Подписка ${planDetails.name}`,
      metadata: { plan, sessionId: session.id },
    });

    return { url: session.url! };
  }

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');

    if (!webhookSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutComplete(session);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentFailed(invoice);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }
    }

    // Forward to subscriptions service
    await this.subscriptionsService.handleStripeWebhook(event);
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const { userId, plan } = session.metadata || {};

    if (!userId || !plan) return;

    // Update payment status
    await this.paymentModel.findOneAndUpdate(
      { providerPaymentId: session.id },
      { status: PaymentStatus.SUCCEEDED },
    );

    // Update subscription
    await this.subscriptionsService.updatePlan(userId, plan as PlanType, {
      subscriptionId: session.subscription as string,
      customerId: session.customer as string,
      priceId: '',
    });
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    await this.paymentModel.findOneAndUpdate(
      { providerPaymentId: invoice.id },
      {
        status: PaymentStatus.SUCCEEDED,
        receiptUrl: invoice.hosted_invoice_url,
      },
    );
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    await this.paymentModel.findOneAndUpdate(
      { providerPaymentId: invoice.id },
      { status: PaymentStatus.FAILED },
    );
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    // Handle subscription cancellation
    console.log('Subscription deleted:', subscription.id);
  }

  async getPaymentHistory(userId: string, options?: {
    page?: number;
    limit?: number;
  }): Promise<{ payments: Payment[]; total: number; page: number; pages: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.paymentModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return {
      payments,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async createPortalSession(userId: string): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Платежная система не настроена');
    }

    const user = await this.usersService.findById(userId);
    if (!user?.stripeCustomerId) {
      throw new BadRequestException('Stripe аккаунт не найден');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${this.configService.get<string>('frontend.url')}/dashboard/subscription`,
    });

    return { url: session.url };
  }
}
