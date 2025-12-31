import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsResolver } from './workflows.resolver';
import { Workflow, WorkflowSchema } from './schemas/workflow.schema';
import { UsersModule } from '../users/users.module';
import { ExecutionsModule } from '../executions/executions.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Workflow.name, schema: WorkflowSchema }]),
    UsersModule,
    forwardRef(() => ExecutionsModule),
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowsResolver],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
