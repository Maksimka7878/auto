import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint, ApiHeader } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Workflow, WorkflowDocument } from '../workflows/schemas/workflow.schema';
import { Execution, ExecutionDocument } from '../executions/schemas/execution.schema';

// Maximum age for webhook timestamps (5 minutes) to prevent replay attacks
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

@ApiTags('webhooks')
@Controller('webhook')
export class WebhookController {
  constructor(
    @InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>,
    @InjectModel(Execution.name) private executionModel: Model<ExecutionDocument>,
    @InjectQueue('executions') private executionsQueue: Queue,
  ) {}

  @Post(':webhookId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получить webhook запрос' })
  @ApiResponse({ status: 200, description: 'Webhook обработан' })
  @ApiResponse({ status: 401, description: 'Недействительная подпись' })
  @ApiResponse({ status: 404, description: 'Webhook не найден' })
  @ApiHeader({ name: 'X-Webhook-Signature', required: false, description: 'HMAC-SHA256 подпись запроса' })
  @ApiHeader({ name: 'X-Webhook-Timestamp', required: false, description: 'Timestamp запроса для защиты от replay' })
  async handleWebhook(
    @Param('webhookId') webhookId: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Find workflow by webhook URL
    const workflow = await this.workflowModel.findOne({
      webhookUrl: `webhook/${webhookId}`,
      isActive: true,
    });

    if (!workflow) {
      throw new NotFoundException('Webhook не найден или деактивирован');
    }

    // Type-safe access to workflow properties
    const workflowAny = workflow as any;

    // If workflow has a webhook secret configured, verify the signature
    if (workflowAny.webhookSecret) {
      const signature = headers['x-webhook-signature'];
      const timestamp = headers['x-webhook-timestamp'];

      if (!signature || !timestamp) {
        throw new UnauthorizedException(
          'Отсутствует подпись webhook. Требуются заголовки X-Webhook-Signature и X-Webhook-Timestamp'
        );
      }

      // Verify timestamp to prevent replay attacks
      const timestampMs = parseInt(timestamp, 10);
      const now = Date.now();
      if (isNaN(timestampMs) || Math.abs(now - timestampMs) > MAX_TIMESTAMP_AGE_MS) {
        throw new UnauthorizedException(
          'Недействительный или устаревший timestamp webhook'
        );
      }

      // Verify HMAC signature
      const rawBody = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(body);
      const expectedSignature = this.computeSignature(
        workflowAny.webhookSecret,
        timestamp,
        rawBody
      );

      if (!this.secureCompare(signature, expectedSignature)) {
        throw new UnauthorizedException('Недействительная подпись webhook');
      }
    }

    // Create execution
    const execution = new this.executionModel({
      workflowId: workflow._id,
      userId: workflow.userId,
      triggerData: {
        body,
        headers: this.sanitizeHeaders(headers),
        timestamp: new Date().toISOString(),
      },
    });
    await execution.save();

    // Queue execution
    await this.executionsQueue.add('run', {
      executionId: execution._id.toString(),
      workflowId: workflow._id.toString(),
      userId: workflow.userId.toString(),
      triggerData: execution.triggerData,
    });

    return {
      success: true,
      executionId: execution._id.toString(),
      message: 'Webhook получен, выполнение запущено',
    };
  }

  @Get(':webhookId')
  @ApiExcludeEndpoint()
  async handleWebhookGet(
    @Param('webhookId') webhookId: string,
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.handleWebhook(webhookId, {}, headers, req);
  }

  private computeSignature(secret: string, timestamp: string, body: string): string {
    // Create signature using timestamp + body to prevent tampering
    const payload = `${timestamp}.${body}`;
    return crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
  }

  private secureCompare(a: string, b: string): boolean {
    // Use timing-safe comparison to prevent timing attacks
    if (a.length !== b.length) {
      return false;
    }
    try {
      return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
    } catch {
      return false;
    }
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-webhook-signature', // Don't store the signature
      'x-webhook-timestamp',
    ];

    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (!sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
