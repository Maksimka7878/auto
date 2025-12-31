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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workflow, WorkflowDocument } from '../workflows/schemas/workflow.schema';
import { Execution, ExecutionDocument } from '../executions/schemas/execution.schema';

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
  @ApiResponse({ status: 404, description: 'Webhook не найден' })
  async handleWebhook(
    @Param('webhookId') webhookId: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    // Find workflow by webhook URL
    const workflow = await this.workflowModel.findOne({
      webhookUrl: `webhook/${webhookId}`,
      isActive: true,
    });

    if (!workflow) {
      throw new NotFoundException('Webhook не найден или деактивирован');
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
  ) {
    return this.handleWebhook(webhookId, {}, headers);
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
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
