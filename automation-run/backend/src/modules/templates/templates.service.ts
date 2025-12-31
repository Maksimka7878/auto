import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Template, TemplateDocument, TemplateCategory } from './schemas/template.schema';
import { CreateTemplateDto } from './dto/create-template.dto';
import { NodeType } from '../workflows/schemas/workflow.schema';

export interface TemplateFilters {
  category?: TemplateCategory;
  tags?: string[];
  difficulty?: string;
  search?: string;
  isFeatured?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

@Injectable()
export class TemplatesService {
  constructor(
    @InjectModel(Template.name) private templateModel: Model<TemplateDocument>,
  ) {}

  async create(createTemplateDto: CreateTemplateDto, userId?: string): Promise<Template> {
    const template = new this.templateModel({
      ...createTemplateDto,
      createdBy: userId ? new Types.ObjectId(userId) : null,
    });
    return template.save();
  }

  async findAll(
    filters: TemplateFilters = {},
    pagination: PaginationOptions = {},
  ): Promise<{ templates: Template[]; total: number; page: number; totalPages: number }> {
    const { category, tags, difficulty, search, isFeatured } = filters;
    const { page = 1, limit = 20 } = pagination;

    const query: any = { isPublic: true };

    if (category) {
      query.category = category;
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      this.templateModel
        .find(query)
        .sort({ isFeatured: -1, usageCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.templateModel.countDocuments(query).exec(),
    ]);

    return {
      templates,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Template> {
    const template = await this.templateModel.findById(id).exec();
    if (!template) {
      throw new NotFoundException('Шаблон не найден');
    }
    return template;
  }

  async findByCategory(category: TemplateCategory): Promise<Template[]> {
    return this.templateModel
      .find({ category, isPublic: true })
      .sort({ usageCount: -1 })
      .exec();
  }

  async getFeatured(): Promise<Template[]> {
    return this.templateModel
      .find({ isPublic: true, isFeatured: true })
      .sort({ usageCount: -1 })
      .limit(10)
      .exec();
  }

  async getPopular(limit = 10): Promise<Template[]> {
    return this.templateModel
      .find({ isPublic: true })
      .sort({ usageCount: -1 })
      .limit(limit)
      .exec();
  }

  async incrementUsage(id: string): Promise<void> {
    await this.templateModel.findByIdAndUpdate(id, { $inc: { usageCount: 1 } }).exec();
  }

  async getCategories(): Promise<{ category: TemplateCategory; count: number }[]> {
    const result = await this.templateModel.aggregate([
      { $match: { isPublic: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]).exec();
    return result;
  }

  async delete(id: string): Promise<void> {
    const result = await this.templateModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Шаблон не найден');
    }
  }

  async seedDefaultTemplates(): Promise<void> {
    const existingCount = await this.templateModel.countDocuments().exec();
    if (existingCount > 0) {
      return; // Templates already exist
    }

    const defaultTemplates: Partial<Template>[] = [
      {
        name: 'Webhook в Telegram',
        description: 'Получает данные через webhook и отправляет уведомление в Telegram',
        category: TemplateCategory.NOTIFICATIONS,
        tags: ['webhook', 'telegram', 'уведомления'],
        difficulty: 'beginner',
        estimatedSetupTime: 5,
        requiredIntegrations: ['telegram'],
        isPublic: true,
        isFeatured: true,
        nodes: [
          {
            id: 'trigger-1',
            type: NodeType.WEBHOOK,
            name: 'Webhook триггер',
            position: { x: 100, y: 100 },
            config: {},
          },
          {
            id: 'action-1',
            type: NodeType.SEND_TELEGRAM,
            name: 'Отправить в Telegram',
            position: { x: 400, y: 100 },
            config: {
              chatId: '{{variables.telegramChatId}}',
              message: 'Новое событие: {{trigger.body.message}}',
            },
          },
        ],
        connections: [
          { id: 'conn-1', sourceId: 'trigger-1', targetId: 'action-1' },
        ],
        variables: { telegramChatId: '' },
      },
      {
        name: 'Форма в Email',
        description: 'Отправляет email при получении данных формы',
        category: TemplateCategory.NOTIFICATIONS,
        tags: ['форма', 'email', 'уведомления'],
        difficulty: 'beginner',
        estimatedSetupTime: 5,
        requiredIntegrations: ['email'],
        isPublic: true,
        isFeatured: true,
        nodes: [
          {
            id: 'trigger-1',
            type: NodeType.FORM_SUBMISSION,
            name: 'Форма отправлена',
            position: { x: 100, y: 100 },
            config: {},
          },
          {
            id: 'action-1',
            type: NodeType.SEND_EMAIL,
            name: 'Отправить Email',
            position: { x: 400, y: 100 },
            config: {
              to: '{{variables.notificationEmail}}',
              subject: 'Новая заявка с сайта',
              body: 'Получена новая заявка:\n\n{{trigger.body}}',
            },
          },
        ],
        connections: [
          { id: 'conn-1', sourceId: 'trigger-1', targetId: 'action-1' },
        ],
        variables: { notificationEmail: '' },
      },
      {
        name: 'Синхронизация в Google Sheets',
        description: 'Записывает данные webhook в Google Таблицу',
        category: TemplateCategory.DATA_SYNC,
        tags: ['google sheets', 'синхронизация', 'данные'],
        difficulty: 'intermediate',
        estimatedSetupTime: 10,
        requiredIntegrations: ['google_sheets'],
        isPublic: true,
        isFeatured: true,
        nodes: [
          {
            id: 'trigger-1',
            type: NodeType.WEBHOOK,
            name: 'Webhook',
            position: { x: 100, y: 100 },
            config: {},
          },
          {
            id: 'action-1',
            type: NodeType.GOOGLE_SHEETS,
            name: 'Записать в таблицу',
            position: { x: 400, y: 100 },
            config: {
              action: 'append',
              spreadsheetId: '{{variables.spreadsheetId}}',
              range: 'Sheet1!A:Z',
              values: '{{trigger.body}}',
            },
          },
        ],
        connections: [
          { id: 'conn-1', sourceId: 'trigger-1', targetId: 'action-1' },
        ],
        variables: { spreadsheetId: '' },
      },
      {
        name: 'Планировщик с условием',
        description: 'Выполняет действие по расписанию с проверкой условия',
        category: TemplateCategory.CUSTOM,
        tags: ['расписание', 'условие', 'автоматизация'],
        difficulty: 'intermediate',
        estimatedSetupTime: 10,
        requiredIntegrations: [],
        isPublic: true,
        nodes: [
          {
            id: 'trigger-1',
            type: NodeType.SCHEDULE,
            name: 'По расписанию',
            position: { x: 100, y: 100 },
            config: { cron: '0 9 * * *' },
          },
          {
            id: 'http-1',
            type: NodeType.HTTP_REQUEST,
            name: 'Получить данные',
            position: { x: 300, y: 100 },
            config: {
              url: '{{variables.apiUrl}}',
              method: 'GET',
            },
          },
          {
            id: 'condition-1',
            type: NodeType.IF_ELSE,
            name: 'Проверка условия',
            position: { x: 500, y: 100 },
            config: {
              leftOperand: '{{http-1.status}}',
              operator: 'equals',
              rightOperand: '200',
            },
          },
          {
            id: 'action-1',
            type: NodeType.SEND_TELEGRAM,
            name: 'Уведомление',
            position: { x: 700, y: 50 },
            config: {
              chatId: '{{variables.telegramChatId}}',
              message: 'Данные получены: {{http-1.data}}',
            },
          },
        ],
        connections: [
          { id: 'conn-1', sourceId: 'trigger-1', targetId: 'http-1' },
          { id: 'conn-2', sourceId: 'http-1', targetId: 'condition-1' },
          { id: 'conn-3', sourceId: 'condition-1', targetId: 'action-1', sourceHandle: 'true' },
        ],
        variables: { apiUrl: '', telegramChatId: '' },
      },
      {
        name: 'Мультиканальное уведомление',
        description: 'Отправляет уведомление в несколько каналов одновременно',
        category: TemplateCategory.NOTIFICATIONS,
        tags: ['telegram', 'slack', 'email', 'мультиканал'],
        difficulty: 'advanced',
        estimatedSetupTime: 15,
        requiredIntegrations: ['telegram', 'slack', 'email'],
        isPublic: true,
        nodes: [
          {
            id: 'trigger-1',
            type: NodeType.WEBHOOK,
            name: 'Webhook',
            position: { x: 100, y: 200 },
            config: {},
          },
          {
            id: 'telegram-1',
            type: NodeType.SEND_TELEGRAM,
            name: 'Telegram',
            position: { x: 400, y: 50 },
            config: {
              chatId: '{{variables.telegramChatId}}',
              message: '{{trigger.body.message}}',
            },
          },
          {
            id: 'slack-1',
            type: NodeType.SEND_SLACK,
            name: 'Slack',
            position: { x: 400, y: 200 },
            config: {
              channel: '{{variables.slackChannel}}',
              text: '{{trigger.body.message}}',
            },
          },
          {
            id: 'email-1',
            type: NodeType.SEND_EMAIL,
            name: 'Email',
            position: { x: 400, y: 350 },
            config: {
              to: '{{variables.email}}',
              subject: 'Уведомление',
              body: '{{trigger.body.message}}',
            },
          },
        ],
        connections: [
          { id: 'conn-1', sourceId: 'trigger-1', targetId: 'telegram-1' },
          { id: 'conn-2', sourceId: 'trigger-1', targetId: 'slack-1' },
          { id: 'conn-3', sourceId: 'trigger-1', targetId: 'email-1' },
        ],
        variables: { telegramChatId: '', slackChannel: '', email: '' },
      },
    ];

    await this.templateModel.insertMany(defaultTemplates);
  }
}
