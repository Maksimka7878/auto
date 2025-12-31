import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Workflow, WorkflowDocument, WorkflowNode, NodeConnection } from './schemas/workflow.schema';

export interface WorkflowExportData {
  version: string;
  exportedAt: string;
  workflow: {
    name: string;
    description: string;
    nodes: WorkflowNode[];
    connections: NodeConnection[];
    variables: Record<string, any>;
    tags: string[];
    retryEnabled: boolean;
    maxRetries: number;
    notifyOnFailure: boolean;
  };
  metadata: {
    nodeCount: number;
    connectionCount: number;
    triggerTypes: string[];
    actionTypes: string[];
  };
}

export interface WorkflowImportData {
  version: string;
  workflow: {
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    connections: NodeConnection[];
    variables?: Record<string, any>;
    tags?: string[];
    retryEnabled?: boolean;
    maxRetries?: number;
    notifyOnFailure?: boolean;
  };
}

@Injectable()
export class WorkflowExportService {
  private readonly EXPORT_VERSION = '1.0';

  constructor(
    @InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>,
  ) {}

  async exportWorkflow(workflowId: string, userId: string): Promise<WorkflowExportData> {
    const workflow = await this.workflowModel.findOne({
      _id: new Types.ObjectId(workflowId),
      userId: new Types.ObjectId(userId),
    }).exec();

    if (!workflow) {
      throw new NotFoundException('Workflow не найден');
    }

    const workflowAny = workflow as any;

    // Analyze workflow structure
    const triggerTypes = [...new Set(
      workflow.nodes
        .filter(n => ['webhook', 'schedule', 'email_received', 'form_submission'].includes(n.type))
        .map(n => n.type)
    )];

    const actionTypes = [...new Set(
      workflow.nodes
        .filter(n => !['webhook', 'schedule', 'email_received', 'form_submission', 'if_else', 'delay', 'loop', 'transform'].includes(n.type))
        .map(n => n.type)
    )];

    return {
      version: this.EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      workflow: {
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        connections: workflow.connections,
        variables: workflow.variables,
        tags: workflow.tags,
        retryEnabled: workflowAny.retryEnabled ?? true,
        maxRetries: workflowAny.maxRetries ?? 3,
        notifyOnFailure: workflowAny.notifyOnFailure ?? false,
      },
      metadata: {
        nodeCount: workflow.nodes.length,
        connectionCount: workflow.connections.length,
        triggerTypes,
        actionTypes,
      },
    };
  }

  async importWorkflow(
    data: WorkflowImportData,
    userId: string,
    options?: { overwrite?: boolean; workflowId?: string },
  ): Promise<Workflow> {
    // Validate import data
    this.validateImportData(data);

    const workflowData = {
      userId: new Types.ObjectId(userId),
      name: data.workflow.name,
      description: data.workflow.description || '',
      nodes: this.sanitizeNodes(data.workflow.nodes),
      connections: this.sanitizeConnections(data.workflow.connections),
      variables: data.workflow.variables || {},
      tags: data.workflow.tags || [],
      isActive: false, // Always import as inactive
      status: 'draft',
      retryEnabled: data.workflow.retryEnabled ?? true,
      maxRetries: data.workflow.maxRetries ?? 3,
      notifyOnFailure: data.workflow.notifyOnFailure ?? false,
    };

    if (options?.overwrite && options?.workflowId) {
      // Update existing workflow
      const updated = await this.workflowModel.findOneAndUpdate(
        {
          _id: new Types.ObjectId(options.workflowId),
          userId: new Types.ObjectId(userId),
        },
        workflowData,
        { new: true },
      ).exec();

      if (!updated) {
        throw new NotFoundException('Workflow не найден для обновления');
      }

      return updated;
    }

    // Create new workflow
    const workflow = new this.workflowModel(workflowData);
    return workflow.save();
  }

  private validateImportData(data: WorkflowImportData): void {
    if (!data.version) {
      throw new BadRequestException('Отсутствует версия формата экспорта');
    }

    if (!data.workflow) {
      throw new BadRequestException('Отсутствуют данные workflow');
    }

    if (!data.workflow.name || typeof data.workflow.name !== 'string') {
      throw new BadRequestException('Некорректное название workflow');
    }

    if (!Array.isArray(data.workflow.nodes)) {
      throw new BadRequestException('Некорректный формат узлов');
    }

    if (!Array.isArray(data.workflow.connections)) {
      throw new BadRequestException('Некорректный формат соединений');
    }

    // Validate node structure
    for (const node of data.workflow.nodes) {
      if (!node.id || !node.type || !node.name) {
        throw new BadRequestException(`Некорректная структура узла: ${JSON.stringify(node)}`);
      }
    }

    // Validate connections reference valid nodes
    const nodeIds = new Set(data.workflow.nodes.map(n => n.id));
    for (const conn of data.workflow.connections) {
      if (!nodeIds.has(conn.sourceId) || !nodeIds.has(conn.targetId)) {
        throw new BadRequestException(
          `Соединение ссылается на несуществующий узел: ${conn.sourceId} -> ${conn.targetId}`
        );
      }
    }
  }

  private sanitizeNodes(nodes: WorkflowNode[]): WorkflowNode[] {
    return nodes.map(node => ({
      id: this.sanitizeId(node.id),
      type: node.type,
      name: String(node.name).slice(0, 200),
      position: {
        x: Number(node.position?.x) || 0,
        y: Number(node.position?.y) || 0,
      },
      config: node.config || {},
      inputs: node.inputs,
      outputs: node.outputs,
    }));
  }

  private sanitizeConnections(connections: NodeConnection[]): NodeConnection[] {
    return connections.map(conn => ({
      id: this.sanitizeId(conn.id),
      sourceId: this.sanitizeId(conn.sourceId),
      targetId: this.sanitizeId(conn.targetId),
      sourceHandle: conn.sourceHandle,
      targetHandle: conn.targetHandle,
    }));
  }

  private sanitizeId(id: string): string {
    // Only allow alphanumeric, underscore, and hyphen
    return String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  }

  async duplicateWorkflow(workflowId: string, userId: string, newName?: string): Promise<Workflow> {
    const exportData = await this.exportWorkflow(workflowId, userId);

    const importData: WorkflowImportData = {
      version: exportData.version,
      workflow: {
        ...exportData.workflow,
        name: newName || `${exportData.workflow.name} (копия)`,
      },
    };

    return this.importWorkflow(importData, userId);
  }
}
