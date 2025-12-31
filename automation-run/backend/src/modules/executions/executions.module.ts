import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { ExecutionProcessor } from './execution.processor';
import { Execution, ExecutionSchema } from './schemas/execution.schema';
import { UsersModule } from '../users/users.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Execution.name, schema: ExecutionSchema }]),
    BullModule.registerQueue({
      name: 'executions',
    }),
    UsersModule,
    forwardRef(() => WorkflowsModule),
    forwardRef(() => IntegrationsModule),
  ],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, ExecutionProcessor],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
