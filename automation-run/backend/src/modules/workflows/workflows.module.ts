import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsResolver } from './workflows.resolver';
import { WorkflowVersionService } from './workflow-version.service';
import { WorkflowExportService } from './workflow-export.service';
import { Workflow, WorkflowSchema } from './schemas/workflow.schema';
import { WorkflowVersion, WorkflowVersionSchema } from './schemas/workflow-version.schema';
import { UsersModule } from '../users/users.module';
import { ExecutionsModule } from '../executions/executions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workflow.name, schema: WorkflowSchema },
      { name: WorkflowVersion.name, schema: WorkflowVersionSchema },
    ]),
    UsersModule,
    forwardRef(() => ExecutionsModule),
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowsResolver, WorkflowVersionService, WorkflowExportService],
  exports: [WorkflowsService, WorkflowVersionService, WorkflowExportService],
})
export class WorkflowsModule {}
