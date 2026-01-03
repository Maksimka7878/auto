import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';

/**
 * Guard to check if user has exceeded their plan's workflow limit
 * Used on workflow creation endpoints
 */
@Injectable()
export class WorkflowLimitGuard implements CanActivate {
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

    // Check if user has unlimited workflows
    if (stats.limits.workflowsLimit === -1) {
      return true;
    }

    // Check if user has exceeded workflow limit
    if (stats.workflowsCount >= stats.limits.workflowsLimit) {
      throw new ForbiddenException({
        statusCode: 403,
        message: `Достигнут лимит автоматизаций (${stats.limits.workflowsLimit}). Перейдите на более высокий тариф для создания новых автоматизаций.`,
        error: 'Workflow Limit Exceeded',
        currentUsage: stats.workflowsCount,
        limit: stats.limits.workflowsLimit,
        plan: stats.plan,
      });
    }

    return true;
  }
}
