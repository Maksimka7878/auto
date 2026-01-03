import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { EmailService } from './services/email.service';
import { TelegramService } from './services/telegram.service';
import { SlackService } from './services/slack.service';
import { HttpService } from './services/http.service';
import { GoogleSheetsService } from './services/google-sheets.service';
import { WebhookController } from './webhook.controller';
import { Workflow, WorkflowSchema } from '../workflows/schemas/workflow.schema';
import { Execution, ExecutionSchema } from '../executions/schemas/execution.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Workflow.name, schema: WorkflowSchema },
      { name: Execution.name, schema: ExecutionSchema },
    ]),
    BullModule.registerQueue({
      name: 'executions',
    }),
  ],
  controllers: [IntegrationsController, WebhookController],
  providers: [
    IntegrationsService,
    EmailService,
    TelegramService,
    SlackService,
    HttpService,
    GoogleSheetsService,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
