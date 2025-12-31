import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Resolver('Workflow')
@UseGuards(JwtAuthGuard)
export class WorkflowsResolver {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Query(() => String)
  async workflows(
    @Context() context,
    @Args('page', { nullable: true }) page?: number,
    @Args('limit', { nullable: true }) limit?: number,
    @Args('status', { nullable: true }) status?: string,
  ) {
    const result = await this.workflowsService.findAll(context.req.user.sub, {
      page,
      limit,
      status,
    });
    return JSON.stringify(result);
  }

  @Query(() => String)
  async workflow(@Context() context, @Args('id') id: string) {
    const result = await this.workflowsService.findById(id, context.req.user.sub);
    return JSON.stringify(result);
  }

  @Mutation(() => String)
  async createWorkflow(
    @Context() context,
    @Args('name') name: string,
    @Args('description', { nullable: true }) description?: string,
  ) {
    const result = await this.workflowsService.create(context.req.user.sub, {
      name,
      description,
    });
    return JSON.stringify(result);
  }

  @Mutation(() => String)
  async updateWorkflow(
    @Context() context,
    @Args('id') id: string,
    @Args('name', { nullable: true }) name?: string,
    @Args('description', { nullable: true }) description?: string,
    @Args('nodes', { nullable: true }) nodes?: string,
    @Args('connections', { nullable: true }) connections?: string,
  ) {
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (nodes) updateData.nodes = JSON.parse(nodes);
    if (connections) updateData.connections = JSON.parse(connections);

    const result = await this.workflowsService.update(
      id,
      context.req.user.sub,
      updateData,
    );
    return JSON.stringify(result);
  }

  @Mutation(() => String)
  async activateWorkflow(@Context() context, @Args('id') id: string) {
    const result = await this.workflowsService.activate(id, context.req.user.sub);
    return JSON.stringify(result);
  }

  @Mutation(() => String)
  async deactivateWorkflow(@Context() context, @Args('id') id: string) {
    const result = await this.workflowsService.deactivate(id, context.req.user.sub);
    return JSON.stringify(result);
  }

  @Mutation(() => Boolean)
  async deleteWorkflow(@Context() context, @Args('id') id: string) {
    await this.workflowsService.delete(id, context.req.user.sub);
    return true;
  }
}
