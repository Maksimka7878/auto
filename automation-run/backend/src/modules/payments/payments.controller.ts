import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Headers,
  RawBodyRequest,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanType } from '../subscriptions/schemas/subscription.schema';
import { AuthenticatedRequest } from '../../common/types/request.interface';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать сессию оплаты' })
  @ApiResponse({ status: 200, description: 'URL для оплаты' })
  async createCheckout(@Req() req: AuthenticatedRequest, @Body() body: { plan: PlanType }) {
    return this.paymentsService.createCheckoutSession(req.user.sub, body.plan);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить историю платежей' })
  @ApiResponse({ status: 200, description: 'История платежей' })
  async getHistory(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentsService.getPaymentHistory(req.user.sub, { page, limit });
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Открыть портал управления подпиской' })
  @ApiResponse({ status: 200, description: 'URL портала' })
  async createPortal(@Req() req: AuthenticatedRequest) {
    return this.paymentsService.createPortalSession(req.user.sub);
  }

  @Post('webhook/stripe')
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }
    await this.paymentsService.handleStripeWebhook(req.rawBody, signature);
    return { received: true };
  }
}
