import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MongoClient, Db, ObjectId } from 'mongodb';

export interface DatabaseConfig {
  action: 'insert' | 'update' | 'delete' | 'find' | 'findOne' | 'count' | 'aggregate';
  connectionString: string;
  database: string;
  collection: string;
  query?: Record<string, any>;
  data?: Record<string, any> | Record<string, any>[];
  options?: {
    limit?: number;
    skip?: number;
    sort?: Record<string, 1 | -1>;
    projection?: Record<string, 0 | 1>;
    upsert?: boolean;
  };
  pipeline?: Record<string, any>[];
}

export interface DatabaseResult {
  success: boolean;
  result?: any;
  insertedId?: string;
  insertedIds?: string[];
  modifiedCount?: number;
  deletedCount?: number;
  matchedCount?: number;
  error?: string;
}

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private connectionCache: Map<string, { client: MongoClient; lastUsed: number }> = new Map();
  private readonly CONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Cleanup stale connections every minute
    setInterval(() => this.cleanupConnections(), 60000);
  }

  async execute(config: DatabaseConfig): Promise<DatabaseResult> {
    const { action, connectionString, database, collection, query, data, options, pipeline } = config;

    // Validate connection string (block internal networks for security)
    this.validateConnectionString(connectionString);

    let client: MongoClient;
    let db: Db;

    try {
      client = await this.getConnection(connectionString);
      db = client.db(database);
      const col = db.collection(collection);

      switch (action) {
        case 'find':
          return this.executeFind(col, query, options);

        case 'findOne':
          return this.executeFindOne(col, query, options);

        case 'insert':
          return this.executeInsert(col, data);

        case 'update':
          return this.executeUpdate(col, query, data, options);

        case 'delete':
          return this.executeDelete(col, query);

        case 'count':
          return this.executeCount(col, query);

        case 'aggregate':
          return this.executeAggregate(col, pipeline);

        default:
          throw new BadRequestException(`Неподдерживаемая операция: ${action}`);
      }
    } catch (error) {
      this.logger.error(`Database operation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async getConnection(connectionString: string): Promise<MongoClient> {
    const cached = this.connectionCache.get(connectionString);

    if (cached) {
      cached.lastUsed = Date.now();
      return cached.client;
    }

    const client = new MongoClient(connectionString, {
      maxPoolSize: 5,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    await client.connect();
    this.connectionCache.set(connectionString, { client, lastUsed: Date.now() });

    this.logger.log('New database connection established');
    return client;
  }

  private cleanupConnections(): void {
    const now = Date.now();

    for (const [key, value] of this.connectionCache.entries()) {
      if (now - value.lastUsed > this.CONNECTION_TIMEOUT) {
        value.client.close().catch(() => {});
        this.connectionCache.delete(key);
        this.logger.log('Stale database connection closed');
      }
    }
  }

  private validateConnectionString(connectionString: string): void {
    const blockedPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '192.168.',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
    ];

    for (const pattern of blockedPatterns) {
      if (connectionString.includes(pattern)) {
        throw new BadRequestException('Подключение к внутренним сетям запрещено');
      }
    }

    if (!connectionString.startsWith('mongodb://') && !connectionString.startsWith('mongodb+srv://')) {
      throw new BadRequestException('Неверный формат строки подключения MongoDB');
    }
  }

  private async executeFind(col: any, query: any, options: any): Promise<DatabaseResult> {
    const parsedQuery = this.parseQuery(query || {});
    let cursor = col.find(parsedQuery);

    if (options?.projection) {
      cursor = cursor.project(options.projection);
    }
    if (options?.sort) {
      cursor = cursor.sort(options.sort);
    }
    if (options?.skip) {
      cursor = cursor.skip(options.skip);
    }
    if (options?.limit) {
      cursor = cursor.limit(Math.min(options.limit, 1000)); // Max 1000 docs
    } else {
      cursor = cursor.limit(100); // Default limit
    }

    const result = await cursor.toArray();
    return { success: true, result };
  }

  private async executeFindOne(col: any, query: any, options: any): Promise<DatabaseResult> {
    const parsedQuery = this.parseQuery(query || {});
    const result = await col.findOne(parsedQuery, {
      projection: options?.projection,
    });
    return { success: true, result };
  }

  private async executeInsert(col: any, data: any): Promise<DatabaseResult> {
    if (!data) {
      throw new BadRequestException('Данные для вставки не указаны');
    }

    if (Array.isArray(data)) {
      const result = await col.insertMany(data);
      return {
        success: true,
        insertedIds: Object.values(result.insertedIds).map((id: any) => id.toString()),
      };
    } else {
      const result = await col.insertOne(data);
      return {
        success: true,
        insertedId: result.insertedId.toString(),
      };
    }
  }

  private async executeUpdate(col: any, query: any, data: any, options: any): Promise<DatabaseResult> {
    if (!query || !data) {
      throw new BadRequestException('Запрос и данные обязательны для обновления');
    }

    const parsedQuery = this.parseQuery(query);
    const updateData = data.$set ? data : { $set: data };

    const result = await col.updateMany(parsedQuery, updateData, {
      upsert: options?.upsert || false,
    });

    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  private async executeDelete(col: any, query: any): Promise<DatabaseResult> {
    if (!query || Object.keys(query).length === 0) {
      throw new BadRequestException('Пустой запрос для удаления запрещён');
    }

    const parsedQuery = this.parseQuery(query);
    const result = await col.deleteMany(parsedQuery);

    return {
      success: true,
      deletedCount: result.deletedCount,
    };
  }

  private async executeCount(col: any, query: any): Promise<DatabaseResult> {
    const parsedQuery = this.parseQuery(query || {});
    const result = await col.countDocuments(parsedQuery);
    return { success: true, result };
  }

  private async executeAggregate(col: any, pipeline: any[]): Promise<DatabaseResult> {
    if (!pipeline || !Array.isArray(pipeline)) {
      throw new BadRequestException('Pipeline обязателен для агрегации');
    }

    // Limit result size
    const safePipeline = [...pipeline, { $limit: 1000 }];
    const result = await col.aggregate(safePipeline).toArray();
    return { success: true, result };
  }

  private parseQuery(query: Record<string, any>): Record<string, any> {
    const parsed: Record<string, any> = {};

    for (const [key, value] of Object.entries(query)) {
      if (key === '_id' && typeof value === 'string' && ObjectId.isValid(value)) {
        parsed[key] = new ObjectId(value);
      } else if (typeof value === 'object' && value !== null) {
        parsed[key] = this.parseQuery(value);
      } else {
        parsed[key] = value;
      }
    }

    return parsed;
  }
}
