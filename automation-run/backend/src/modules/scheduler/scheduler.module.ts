import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SchedulerService } from './scheduler.service';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ExecutionsModule } from '../executions/executions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'executions',
    }),
    forwardRef(() => WorkflowsModule),
    forwardRef(() => ExecutionsModule),
    UsersModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
