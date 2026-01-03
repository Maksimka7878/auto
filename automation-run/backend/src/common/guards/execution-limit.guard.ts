import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';

/**
 * Guard to check if user has exceeded their plan's execution limit
 * Used on workflow execution endpoints
 */
@Injectable()
export class ExecutionLimitGuard implements CanActivate {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.sub) {
      return true; // Let auth guard handle unauthenticated requests
    }

    const stats = await this.usersService.getUserStats(user.sub);

    // Check if user has unlimited executions
    if (stats.limits.executionsLimit === -1) {
      return true;
    }

    // Check if user has exceeded monthly execution limit
    if (stats.executionsThisMonth >= stats.limits.executionsLimit) {
      throw new ForbiddenException({
        statusCode: 403,
        message: `Достигнут месячный лимит выполнений (${stats.limits.executionsLimit}). Перейдите на более высокий тариф для увеличения лимита.`,
        error: 'Execution Limit Exceeded',
        currentUsage: stats.executionsThisMonth,
        limit: stats.limits.executionsLimit,
        plan: stats.plan,
      });
    }

    return true;
  }
}
