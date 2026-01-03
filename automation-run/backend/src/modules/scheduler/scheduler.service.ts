import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CronJob } from 'cron';
import { WorkflowsService } from '../workflows/workflows.service';
import { ExecutionsService } from '../executions/executions.service';
import { UsersService } from '../users/users.service';
import { NodeType } from '../workflows/schemas/workflow.schema';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private activeJobs: Map<string, CronJob> = new Map();

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private workflowsService: WorkflowsService,
    private executionsService: ExecutionsService,
    private usersService: UsersService,
    @InjectQueue('executions') private executionsQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Инициализация планировщика задач...');
    await this.syncScheduledWorkflows();
  }

  /**
   * Синхронизация всех активных workflow с schedule-триггерами
   */
  async syncScheduledWorkflows(): Promise<void> {
    try {
      const workflows = await this.workflowsService.getActiveScheduledWorkflows();

      this.logger.log(`Найдено ${workflows.length} активных workflow с расписанием`);

      // Удаляем старые задачи
      for (const [workflowId] of this.activeJobs) {
        if (!workflows.find(w => w._id.toString() === workflowId)) {
          this.removeScheduledJob(workflowId);
        }
      }

      // Добавляем/обновляем задачи
      for (const workflow of workflows) {
        const scheduleNode = workflow.nodes.find(n => n.type === NodeType.SCHEDULE);
        if (scheduleNode?.config?.cronExpression) {
          await this.addScheduledJob(
            workflow._id.toString(),
            workflow.userId.toString(),
            scheduleNode.config.cronExpression,
          );
        }
      }
    } catch (error) {
      this.logger.error('Ошибка синхронизации расписаний:', error.message);
    }
  }

  /**
   * Добавление cron-задачи для workflow
   */
  async addScheduledJob(workflowId: string, userId: string, cronExpression: string): Promise<void> {
    try {
      // Удаляем существующую задачу если есть
      if (this.activeJobs.has(workflowId)) {
        this.removeScheduledJob(workflowId);
      }

      const job = new CronJob(cronExpression, async () => {
        await this.executeScheduledWorkflow(workflowId, userId);
      });

      this.schedulerRegistry.addCronJob(`workflow_${workflowId}`, job);
      job.start();

      this.activeJobs.set(workflowId, job);
      this.logger.log(`Задача добавлена для workflow ${workflowId}: ${cronExpression}`);
    } catch (error) {
      this.logger.error(`Ошибка добавления задачи для ${workflowId}:`, error.message);
    }
  }

  /**
   * Удаление cron-задачи
   */
  removeScheduledJob(workflowId: string): void {
    try {
      const job = this.activeJobs.get(workflowId);
      if (job) {
        job.stop();
        this.activeJobs.delete(workflowId);

        try {
          this.schedulerRegistry.deleteCronJob(`workflow_${workflowId}`);
        } catch {
          // Задача может уже не существовать в registry
        }

        this.logger.log(`Задача удалена для workflow ${workflowId}`);
      }
    } catch (error) {
      this.logger.error(`Ошибка удаления задачи для ${workflowId}:`, error.message);
    }
  }

  /**
   * Выполнение workflow по расписанию
   */
  private async executeScheduledWorkflow(workflowId: string, userId: string): Promise<void> {
    try {
      this.logger.log(`Запуск workflow по расписанию: ${workflowId}`);

      // Создаём execution
      const execution = await this.executionsService.create(workflowId, userId, {
        triggeredBy: 'schedule',
        scheduledAt: new Date().toISOString(),
      });

      // Добавляем в очередь
      await this.executionsQueue.add('run', {
        executionId: execution._id.toString(),
        workflowId,
        userId,
        triggerData: {
          triggeredBy: 'schedule',
          scheduledAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Workflow ${workflowId} добавлен в очередь выполнения`);
    } catch (error) {
      this.logger.error(`Ошибка запуска workflow ${workflowId}:`, error.message);
    }
  }

  /**
   * Ежеминутная проверка новых/изменённых workflow
   * Синхронизирует расписания каждые 5 минут
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleScheduleSync(): Promise<void> {
    this.logger.debug('Синхронизация расписаний...');
    await this.syncScheduledWorkflows();
  }

  /**
   * Сброс месячных счётчиков выполнений
   * Запускается в начале каждого месяца
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlyReset(): Promise<void> {
    this.logger.log('Сброс месячных счётчиков выполнений');
    await this.usersService.resetMonthlyExecutions();
  }

  /**
   * Получить список активных задач
   */
  getActiveJobs(): { workflowId: string; nextRun: Date | null }[] {
    const jobs: { workflowId: string; nextRun: Date | null }[] = [];

    for (const [workflowId, job] of this.activeJobs) {
      jobs.push({
        workflowId,
        nextRun: job.nextDate()?.toJSDate() || null,
      });
    }

    return jobs;
  }

  /**
   * Проверка валидности cron-выражения
   */
  validateCronExpression(expression: string): boolean {
    try {
      new CronJob(expression, () => {});
      return true;
    } catch {
      return false;
    }
  }
}
