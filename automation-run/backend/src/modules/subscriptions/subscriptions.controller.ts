import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanType } from './schemas/subscription.schema';

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
  async getCurrentSubscription(@Request() req: Express.Request) {
    return this.subscriptionsService.getCurrentSubscription(req.user!.sub);
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Повысить тариф' })
  @ApiResponse({ status: 200, description: 'Тариф обновлен' })
  async upgrade(@Request() req: Express.Request, @Body() body: { plan: PlanType }) {
    return this.subscriptionsService.updatePlan(req.user!.sub, body.plan);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отменить подписку' })
  @ApiResponse({ status: 200, description: 'Подписка отменена' })
  async cancel(@Request() req: Express.Request, @Body() body: { immediately?: boolean }) {
    return this.subscriptionsService.cancelSubscription(
      req.user!.sub,
      body.immediately || false,
    );
  }
}
