import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { ExecutionProcessor } from './execution.processor';
import { RetryService } from './retry.service';
import { Execution, ExecutionSchema } from './schemas/execution.schema';
import { Workflow, WorkflowSchema } from '../workflows/schemas/workflow.schema';
import { UsersModule } from '../users/users.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Execution.name, schema: ExecutionSchema },
      { name: Workflow.name, schema: WorkflowSchema },
    ]),
    BullModule.registerQueue({
      name: 'executions',
    }),
    UsersModule,
    forwardRef(() => WorkflowsModule),
    forwardRef(() => IntegrationsModule),
    NotificationsModule,
  ],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, ExecutionProcessor, RetryService],
  exports: [ExecutionsService, RetryService],
})
export class ExecutionsModule {}
