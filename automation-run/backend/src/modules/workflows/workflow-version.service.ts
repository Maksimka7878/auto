import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkflowVersion, WorkflowVersionDocument } from './schemas/workflow-version.schema';
import { Workflow, WorkflowDocument } from './schemas/workflow.schema';

@Injectable()
export class WorkflowVersionService {
  constructor(
    @InjectModel(WorkflowVersion.name) private versionModel: Model<WorkflowVersionDocument>,
    @InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>,
  ) {}

  async createVersion(
    workflowId: string,
    userId: string,
    changeDescription?: string,
  ): Promise<WorkflowVersion> {
    const workflow = await this.workflowModel.findById(workflowId).exec();
    if (!workflow) {
      throw new NotFoundException('Workflow не найден');
    }

    // Get the latest version number
    const latestVersion = await this.versionModel
      .findOne({ workflowId: new Types.ObjectId(workflowId) })
      .sort({ version: -1 })
      .exec();

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    const version = new this.versionModel({
      workflowId: new Types.ObjectId(workflowId),
      userId: new Types.ObjectId(userId),
      version: nextVersion,
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes,
      connections: workflow.connections,
      variables: workflow.variables,
      tags: workflow.tags,
      changeDescription: changeDescription || `Версия ${nextVersion}`,
      isPublished: workflow.isActive,
    });

    return version.save();
  }

  async getVersions(
    workflowId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ versions: WorkflowVersion[]; total: number }> {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const [versions, total] = await Promise.all([
      this.versionModel
        .find({ workflowId: new Types.ObjectId(workflowId) })
        .sort({ version: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.versionModel.countDocuments({ workflowId: new Types.ObjectId(workflowId) }).exec(),
    ]);

    return { versions, total };
  }

  async getVersion(workflowId: string, version: number): Promise<WorkflowVersion> {
    const versionDoc = await this.versionModel
      .findOne({
        workflowId: new Types.ObjectId(workflowId),
        version,
      })
      .exec();

    if (!versionDoc) {
      throw new NotFoundException(`Версия ${version} не найдена`);
    }

    return versionDoc;
  }

  async getLatestVersion(workflowId: string): Promise<WorkflowVersion | null> {
    return this.versionModel
      .findOne({ workflowId: new Types.ObjectId(workflowId) })
      .sort({ version: -1 })
      .exec();
  }

  async rollback(workflowId: string, targetVersion: number, userId: string): Promise<Workflow> {
    const version = await this.getVersion(workflowId, targetVersion);

    // Update the workflow with the version data
    const workflow = await this.workflowModel.findByIdAndUpdate(
      workflowId,
      {
        name: version.name,
        description: version.description,
        nodes: version.nodes,
        connections: version.connections,
        variables: version.variables,
        tags: version.tags,
      },
      { new: true },
    ).exec();

    if (!workflow) {
      throw new NotFoundException('Workflow не найден');
    }

    // Create a new version for the rollback
    await this.createVersion(
      workflowId,
      userId,
      `Откат к версии ${targetVersion}`,
    );

    return workflow;
  }

  async compareVersions(
    workflowId: string,
    version1: number,
    version2: number,
  ): Promise<{
    added: { nodes: string[]; connections: string[] };
    removed: { nodes: string[]; connections: string[] };
    modified: { nodes: string[]; variables: string[] };
  }> {
    const [v1, v2] = await Promise.all([
      this.getVersion(workflowId, version1),
      this.getVersion(workflowId, version2),
    ]);

    const v1NodeIds = new Set(v1.nodes.map(n => n.id));
    const v2NodeIds = new Set(v2.nodes.map(n => n.id));
    const v1ConnIds = new Set(v1.connections.map(c => c.id));
    const v2ConnIds = new Set(v2.connections.map(c => c.id));

    // Find added/removed nodes
    const addedNodes = [...v2NodeIds].filter(id => !v1NodeIds.has(id));
    const removedNodes = [...v1NodeIds].filter(id => !v2NodeIds.has(id));

    // Find added/removed connections
    const addedConnections = [...v2ConnIds].filter(id => !v1ConnIds.has(id));
    const removedConnections = [...v1ConnIds].filter(id => !v2ConnIds.has(id));

    // Find modified nodes (same ID but different config)
    const modifiedNodes = v2.nodes
      .filter(n2 => {
        const n1 = v1.nodes.find(n => n.id === n2.id);
        if (!n1) return false;
        return JSON.stringify(n1.config) !== JSON.stringify(n2.config);
      })
      .map(n => n.id);

    // Find modified variables
    const modifiedVariables = Object.keys(v2.variables || {}).filter(key => {
      const v1Value = v1.variables?.[key];
      const v2Value = v2.variables?.[key];
      return JSON.stringify(v1Value) !== JSON.stringify(v2Value);
    });

    return {
      added: { nodes: addedNodes, connections: addedConnections },
      removed: { nodes: removedNodes, connections: removedConnections },
      modified: { nodes: modifiedNodes, variables: modifiedVariables },
    };
  }

  async deleteVersionsForWorkflow(workflowId: string): Promise<void> {
    await this.versionModel.deleteMany({
      workflowId: new Types.ObjectId(workflowId),
    }).exec();
  }
}
