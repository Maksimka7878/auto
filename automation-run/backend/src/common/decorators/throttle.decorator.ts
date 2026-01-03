import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { PlanThrottlerGuard } from '../guards/plan-throttler.guard';

/**
 * Custom rate limiting decorator
 * Uses plan-based limits when applied to protected routes
 */
export const PlanThrottle = () =>
  applyDecorators(UseGuards(PlanThrottlerGuard));

/**
 * Skip rate limiting for specific routes
 */
export const SkipThrottle = () => SetMetadata('skipThrottle', true);

/**
 * Set custom throttle limits for specific routes
 */
export const CustomThrottle = (limit: number, ttl: number) =>
  SetMetadata('throttle', { limit, ttl });
