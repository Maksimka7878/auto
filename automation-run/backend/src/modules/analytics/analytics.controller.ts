import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/request.interface';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Получить статистику для дашборда' })
  @ApiResponse({ status: 200, description: 'Статистика дашборда' })
  async getDashboardStats(@Req() req: AuthenticatedRequest) {
    return this.analyticsService.getDashboardStats(req.user.sub);
  }

  @Get('workflows/:id')
  @ApiOperation({ summary: 'Получить аналитику workflow' })
  @ApiResponse({ status: 200, description: 'Аналитика workflow' })
  async getWorkflowAnalytics(
    @Param('id') workflowId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.analyticsService.getWorkflowAnalytics(workflowId, req.user.sub);
  }
}
