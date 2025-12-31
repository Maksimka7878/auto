import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Workflow, WorkflowDocument, WorkflowNode, NodeConnection } from './schemas/workflow.schema';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>,
    private usersService: UsersService,
  ) {}

  async create(userId: string, createWorkflowDto: CreateWorkflowDto): Promise<Workflow> {
    // Check user limits
    const userStats = await this.usersService.getUserStats(userId);
    if (userStats.limits.workflowsLimit !== -1 &&
        userStats.workflowsCount >= userStats.limits.workflowsLimit) {
      throw new ForbiddenException(
        `Достигнут лимит автоматизаций (${userStats.limits.workflowsLimit}) для вашего тарифа. Перейдите на более высокий тариф.`
      );
    }

    const webhookUrl = `webhook/${uuidv4()}`;
    const webhookSecret = uuidv4();

    const workflow = new this.workflowModel({
      ...createWorkflowDto,
      userId: new Types.ObjectId(userId),
      webhookUrl,
      webhookSecret,
    });

    const savedWorkflow = await workflow.save();

    // Increment user workflow count
    await this.usersService.incrementWorkflowCount(userId);

    return savedWorkflow;
  }

  async findAll(userId: string, options?: {
    status?: string;
    isActive?: boolean;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ workflows: Workflow[]; total: number; page: number; pages: number }> {
    const query: any = { userId: new Types.ObjectId(userId) };

    if (options?.status) {
      query.status = options.status;
    }
    if (options?.isActive !== undefined) {
      query.isActive = options.isActive;
    }
    if (options?.tags && options.tags.length > 0) {
      query.tags = { $in: options.tags };
    }

    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const [workflows, total] = await Promise.all([
      this.workflowModel
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.workflowModel.countDocuments(query),
    ]);

    return {
      workflows,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, userId: string): Promise<Workflow> {
    const workflow = await this.workflowModel.findById(id).exec();

    if (!workflow) {
      throw new NotFoundException('Автоматизация не найдена');
    }

    if (workflow.userId.toString() !== userId) {
      throw new ForbiddenException('Доступ запрещен');
    }

    return workflow;
  }

  async findByWebhookUrl(webhookUrl: string): Promise<Workflow | null> {
    return this.workflowModel.findOne({ webhookUrl, isActive: true }).exec();
  }

  async update(id: string, userId: string, updateWorkflowDto: UpdateWorkflowDto): Promise<Workflow> {
    const workflow = await this.findById(id, userId);

    // Validate nodes if provided
    if (updateWorkflowDto.nodes) {
      this.validateNodes(updateWorkflowDto.nodes);
    }

    // Validate connections if provided
    if (updateWorkflowDto.connections && updateWorkflowDto.nodes) {
      this.validateConnections(updateWorkflowDto.nodes, updateWorkflowDto.connections);
    }

    const updated = await this.workflowModel
      .findByIdAndUpdate(id, updateWorkflowDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Автоматизация не найдена после обновления');
    }

    return updated;
  }

  async activate(id: string, userId: string): Promise<Workflow> {
    const workflow = await this.findById(id, userId);

    // Validate workflow before activation
    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new BadRequestException('Добавьте хотя бы один узел');
    }

    const hasTrigger = workflow.nodes.some(node =>
      ['webhook', 'schedule', 'email_received', 'form_submission'].includes(node.type)
    );
    if (!hasTrigger) {
      throw new BadRequestException('Добавьте триггер для запуска автоматизации');
    }

    const activated = await this.workflowModel
      .findByIdAndUpdate(
        id,
        { isActive: true, status: 'active' },
        { new: true },
      )
      .exec();

    if (!activated) {
      throw new NotFoundException('Автоматизация не найдена после активации');
    }

    return activated;
  }

  async deactivate(id: string, userId: string): Promise<Workflow> {
    await this.findById(id, userId);

    const deactivated = await this.workflowModel
      .findByIdAndUpdate(
        id,
        { isActive: false, status: 'paused' },
        { new: true },
      )
      .exec();

    if (!deactivated) {
      throw new NotFoundException('Автоматизация не найдена после деактивации');
    }

    return deactivated;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);

    await this.workflowModel.findByIdAndDelete(id);

    // Decrement user workflow count
    await this.usersService.decrementWorkflowCount(userId);
  }

  async updateExecutionStats(id: string, success: boolean): Promise<void> {
    const update: any = {
      lastExecutedAt: new Date(),
      $inc: { executionCount: 1 },
    };

    if (success) {
      update.$inc.successCount = 1;
    } else {
      update.$inc.errorCount = 1;
      update.status = 'error';
    }

    await this.workflowModel.findByIdAndUpdate(id, update);
  }

  async duplicate(id: string, userId: string): Promise<Workflow> {
    const original = await this.findById(id, userId);

    const duplicate = new this.workflowModel({
      userId: new Types.ObjectId(userId),
      name: `${original.name} (копия)`,
      description: original.description,
      nodes: original.nodes,
      connections: original.connections,
      variables: original.variables,
      tags: original.tags,
      webhookUrl: `webhook/${uuidv4()}`,
      webhookSecret: uuidv4(),
      status: 'draft',
      isActive: false,
    });

    const saved = await duplicate.save();
    await this.usersService.incrementWorkflowCount(userId);

    return saved;
  }

  async getActiveScheduledWorkflows(): Promise<Workflow[]> {
    return this.workflowModel
      .find({
        isActive: true,
        'nodes.type': 'schedule',
      })
      .exec();
  }

  private validateNodes(nodes: { id: string; type: string; name: string }[]): void {
    const ids = new Set<string>();
    for (const node of nodes) {
      if (ids.has(node.id)) {
        throw new BadRequestException(`Дублирующийся ID узла: ${node.id}`);
      }
      ids.add(node.id);

      if (!node.type || !node.name) {
        throw new BadRequestException('Каждый узел должен иметь тип и название');
      }
    }
  }

  private validateConnections(nodes: { id: string }[], connections: NodeConnection[]): void {
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const conn of connections) {
      if (!nodeIds.has(conn.sourceId)) {
        throw new BadRequestException(`Неверный источник соединения: ${conn.sourceId}`);
      }
      if (!nodeIds.has(conn.targetId)) {
        throw new BadRequestException(`Неверная цель соединения: ${conn.targetId}`);
      }
    }
  }
}
