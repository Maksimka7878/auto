import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Inject, forwardRef } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { ExecutionStatus, StepLog } from './schemas/execution.schema';
import { WorkflowNode, NodeType } from '../workflows/schemas/workflow.schema';

interface ExecutionJob {
  executionId: string;
  workflowId: string;
  userId: string;
  triggerData: Record<string, any>;
}

@Processor('executions')
export class ExecutionProcessor {
  constructor(
    private readonly executionsService: ExecutionsService,
    @Inject(forwardRef(() => WorkflowsService))
    private readonly workflowsService: WorkflowsService,
    @Inject(forwardRef(() => IntegrationsService))
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Process('run')
  async handleExecution(job: Job<ExecutionJob>) {
    const { executionId, workflowId, userId, triggerData } = job.data;

    try {
      // Start execution
      await this.executionsService.start(executionId);

      // Get workflow
      const workflow = await this.workflowsService.findById(workflowId, userId);

      // Build execution order
      const executionOrder = this.buildExecutionOrder(workflow.nodes, workflow.connections);

      // Context for passing data between nodes
      const context: Record<string, any> = {
        trigger: triggerData,
        variables: workflow.variables || {},
      };

      // Execute nodes in order
      for (const node of executionOrder) {
        const stepLog: StepLog = {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          status: ExecutionStatus.RUNNING,
          startedAt: new Date(),
        };

        await this.executionsService.addStepLog(executionId, stepLog);

        try {
          const output = await this.executeNode(node, context);
          context[node.id] = output;

          await this.executionsService.updateStepLog(executionId, node.id, {
            status: ExecutionStatus.SUCCESS,
            finishedAt: new Date(),
            duration: Date.now() - stepLog.startedAt.getTime(),
            output,
          });
        } catch (error) {
          await this.executionsService.updateStepLog(executionId, node.id, {
            status: ExecutionStatus.ERROR,
            finishedAt: new Date(),
            duration: Date.now() - stepLog.startedAt.getTime(),
            error: error.message,
          });
          throw error;
        }
      }

      // Complete execution
      await this.executionsService.complete(executionId, true);
      await this.workflowsService.updateExecutionStats(workflowId, true);

    } catch (error) {
      await this.executionsService.complete(executionId, false, error.message);
      await this.workflowsService.updateExecutionStats(workflowId, false);
      throw error;
    }
  }

  private buildExecutionOrder(nodes: WorkflowNode[], connections: any[]): WorkflowNode[] {
    // Find trigger node (starting point)
    const triggerTypes = [
      NodeType.WEBHOOK,
      NodeType.SCHEDULE,
      NodeType.EMAIL_RECEIVED,
      NodeType.FORM_SUBMISSION,
    ];

    const triggerNode = nodes.find(n => triggerTypes.includes(n.type as NodeType));
    if (!triggerNode) {
      throw new Error('Триггер не найден');
    }

    // Build adjacency list
    const adjacency: Map<string, string[]> = new Map();
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    for (const conn of connections) {
      const targets = adjacency.get(conn.sourceId) || [];
      targets.push(conn.targetId);
      adjacency.set(conn.sourceId, targets);
    }

    // BFS traversal
    const visited = new Set<string>();
    const order: WorkflowNode[] = [];
    const queue: string[] = [triggerNode.id];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;

      visited.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        order.push(node);
      }

      const targets = adjacency.get(nodeId) || [];
      for (const targetId of targets) {
        if (!visited.has(targetId)) {
          queue.push(targetId);
        }
      }
    }

    return order;
  }

  private async executeNode(node: WorkflowNode, context: Record<string, any>): Promise<any> {
    const config = this.resolveVariables(node.config || {}, context);

    switch (node.type) {
      case NodeType.WEBHOOK:
      case NodeType.SCHEDULE:
      case NodeType.EMAIL_RECEIVED:
      case NodeType.FORM_SUBMISSION:
        return context.trigger;

      case NodeType.SEND_EMAIL:
        return this.integrationsService.sendEmail(config as {
          to: string;
          subject: string;
          body: string;
          isHtml?: boolean;
        });

      case NodeType.SEND_TELEGRAM:
        return this.integrationsService.sendTelegram(config as {
          chatId: string;
          message: string;
          parseMode?: 'HTML' | 'Markdown';
        });

      case NodeType.SEND_SLACK:
        return this.integrationsService.sendSlack(config as {
          channel: string;
          text: string;
          blocks?: any[];
        });

      case NodeType.HTTP_REQUEST:
        return this.integrationsService.httpRequest(config as {
          url: string;
          method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
          headers?: Record<string, string>;
          body?: any;
          timeout?: number;
        });

      case NodeType.GOOGLE_SHEETS:
        return this.integrationsService.googleSheets(config as {
          action: 'append' | 'read' | 'update';
          spreadsheetId: string;
          range: string;
          values?: any[][];
          credentials: any;
        });

      case NodeType.DATABASE:
        return this.integrationsService.database(config as {
          action: 'insert' | 'update' | 'delete' | 'find';
          connectionString: string;
          collection: string;
          query?: any;
          data?: any;
        });

      case NodeType.IF_ELSE:
        return this.executeIfElse(config, context);

      case NodeType.DELAY:
        return this.executeDelay(config);

      case NodeType.LOOP:
        return this.executeLoop(config, context);

      case NodeType.TRANSFORM:
        return this.executeTransform(config, context);

      default:
        throw new Error(`Неизвестный тип узла: ${node.type}`);
    }
  }

  // Dangerous property names that could lead to prototype pollution
  private readonly BLOCKED_PATH_SEGMENTS = new Set([
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
  ]);

  private isValidPathSegment(segment: string): boolean {
    // Block dangerous property names
    if (this.BLOCKED_PATH_SEGMENTS.has(segment)) {
      return false;
    }
    // Only allow alphanumeric, underscore, and hyphen (no special characters)
    return /^[a-zA-Z0-9_-]+$/.test(segment);
  }

  private resolveVariables(config: Record<string, any>, context: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        // Replace {{nodeId.field}} with actual values
        resolved[key] = value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
          const parts = path.split('.');

          // Validate all path segments to prevent prototype pollution
          for (const part of parts) {
            if (!this.isValidPathSegment(part)) {
              console.warn(`Blocked potentially dangerous path segment: ${part}`);
              return match; // Return original if path is invalid
            }
          }

          let current = context;
          for (const part of parts) {
            if (current === null || current === undefined) {
              return match;
            }
            // Only access own properties, not prototype chain
            if (Object.prototype.hasOwnProperty.call(current, part)) {
              current = current[part];
            } else {
              return match;
            }
          }
          return current !== undefined ? String(current) : match;
        });
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveVariables(value, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  private executeIfElse(config: any, context: Record<string, any>): { branch: string; value: any } {
    const { condition, leftOperand, operator, rightOperand } = config;

    const left = this.resolveValue(leftOperand, context);
    const right = this.resolveValue(rightOperand, context);

    let result = false;

    switch (operator) {
      case 'equals':
        result = left === right;
        break;
      case 'not_equals':
        result = left !== right;
        break;
      case 'contains':
        result = String(left).includes(String(right));
        break;
      case 'greater_than':
        result = Number(left) > Number(right);
        break;
      case 'less_than':
        result = Number(left) < Number(right);
        break;
      case 'is_empty':
        result = !left || left === '';
        break;
      case 'is_not_empty':
        result = !!left && left !== '';
        break;
    }

    return {
      branch: result ? 'true' : 'false',
      value: result,
    };
  }

  private async executeDelay(config: any): Promise<{ delayed: boolean }> {
    const { duration, unit } = config;
    let ms = duration;

    switch (unit) {
      case 'seconds':
        ms = duration * 1000;
        break;
      case 'minutes':
        ms = duration * 60 * 1000;
        break;
      case 'hours':
        ms = duration * 60 * 60 * 1000;
        break;
    }

    // Max 5 minutes delay in processor
    if (ms > 300000) {
      ms = 300000;
    }

    await new Promise(resolve => setTimeout(resolve, ms));
    return { delayed: true };
  }

  private executeLoop(config: any, context: Record<string, any>): { items: any[]; count: number } {
    const { source, maxIterations = 100 } = config;
    const items = this.resolveValue(source, context);

    if (!Array.isArray(items)) {
      return { items: [], count: 0 };
    }

    const limitedItems = items.slice(0, maxIterations);
    return {
      items: limitedItems,
      count: limitedItems.length,
    };
  }

  private executeTransform(config: any, context: Record<string, any>): any {
    const { operation, input, mappings } = config;
    const data = this.resolveValue(input, context);

    switch (operation) {
      case 'map':
        if (Array.isArray(data) && mappings) {
          return data.map(item => {
            const result: Record<string, any> = {};
            for (const [key, path] of Object.entries(mappings)) {
              result[key] = this.resolveValue(path as string, { ...context, item });
            }
            return result;
          });
        }
        return data;

      case 'filter':
        if (Array.isArray(data) && config.condition) {
          return data.filter(item =>
            this.resolveValue(config.condition, { ...context, item })
          );
        }
        return data;

      case 'json_parse':
        return typeof data === 'string' ? JSON.parse(data) : data;

      case 'json_stringify':
        return JSON.stringify(data);

      case 'to_upper':
        return String(data).toUpperCase();

      case 'to_lower':
        return String(data).toLowerCase();

      default:
        return data;
    }
  }

  private resolveValue(path: string | any, context: Record<string, any>): any {
    if (typeof path !== 'string') return path;

    if (path.startsWith('{{') && path.endsWith('}}')) {
      const innerPath = path.slice(2, -2);
      const parts = innerPath.split('.');

      // Validate all path segments to prevent prototype pollution
      for (const part of parts) {
        if (!this.isValidPathSegment(part)) {
          console.warn(`Blocked potentially dangerous path segment: ${part}`);
          return path; // Return original if path is invalid
        }
      }

      let current = context;
      for (const part of parts) {
        if (current === null || current === undefined) {
          return undefined;
        }
        // Only access own properties, not prototype chain
        if (Object.prototype.hasOwnProperty.call(current, part)) {
          current = current[part];
        } else {
          return undefined;
        }
      }
      return current;
    }

    return path;
  }
}
