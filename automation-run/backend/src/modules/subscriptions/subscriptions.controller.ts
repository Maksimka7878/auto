import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanType } from './schemas/subscription.schema';
import { AuthenticatedRequest } from '../../common/types/request.interface';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Получить список тарифных планов' })
  @ApiResponse({ status: 200, description: 'Список тарифов' })
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить текущую подписку' })
  @ApiResponse({ status: 200, description: 'Текущая подписка' })
  async getCurrentSubscription(@Req() req: AuthenticatedRequest) {
    return this.subscriptionsService.getCurrentSubscription(req.user.sub);
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Повысить тариф' })
  @ApiResponse({ status: 200, description: 'Тариф обновлен' })
  async upgrade(@Req() req: AuthenticatedRequest, @Body() body: { plan: PlanType }) {
    return this.subscriptionsService.updatePlan(req.user.sub, body.plan);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отменить подписку' })
  @ApiResponse({ status: 200, description: 'Подписка отменена' })
  async cancel(@Req() req: AuthenticatedRequest, @Body() body: { immediately?: boolean }) {
    return this.subscriptionsService.cancelSubscription(
      req.user.sub,
      body.immediately || false,
    );
  }
}
