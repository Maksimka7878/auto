import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

/**
 * Rate limits based on subscription plan:
 * - Free: 60 requests per minute
 * - Pro: 300 requests per minute
 * - Enterprise: 1000 requests per minute
 */
const PLAN_LIMITS = {
  free: { ttl: 60000, limit: 60 },
  pro: { ttl: 60000, limit: 300 },
  enterprise: { ttl: 60000, limit: 1000 },
};

@Injectable()
export class PlanThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use user ID if authenticated, otherwise use IP
    const user = req.user;
    if (user?.sub) {
      return `user_${user.sub}`;
    }
    return req.ip;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Get plan-specific limits
    const plan = user?.plan || 'free';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    // Store limits for use in handleRequest
    request.throttlerLimits = limits;

    try {
      return await super.canActivate(context);
    } catch (error) {
      if (error instanceof ThrottlerException) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Превышен лимит запросов. Лимит для плана ${plan}: ${limits.limit} запросов в минуту`,
            error: 'Too Many Requests',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw error;
    }
  }

  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const limits = request.throttlerLimits;

    // Use plan-specific limits if available
    if (limits) {
      return super.handleRequest(context, limits.limit, limits.ttl);
    }

    return super.handleRequest(context, limit, ttl);
  }
}
