import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    @InjectConnection() private connection: Connection,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Проверка здоровья системы' })
  @ApiResponse({ status: 200, description: 'Система работает нормально' })
  @ApiResponse({ status: 503, description: 'Система недоступна' })
  check() {
    return this.health.check([
      // MongoDB check
      () => this.mongoose.pingCheck('mongodb'),

      // Memory check (heap used < 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // Memory RSS check (< 500MB)
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Проверка доступности (liveness)' })
  @ApiResponse({ status: 200, description: 'Сервис жив' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Проверка готовности (readiness)' })
  @ApiResponse({ status: 200, description: 'Сервис готов к работе' })
  @ApiResponse({ status: 503, description: 'Сервис не готов' })
  readiness() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
    ]);
  }

  @Get('info')
  @ApiOperation({ summary: 'Информация о системе' })
  @ApiResponse({ status: 200, description: 'Информация о сервисе' })
  info() {
    return {
      name: 'AUTOMATION.RUN API',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      },
      database: {
        status: this.connection.readyState === 1 ? 'connected' : 'disconnected',
        host: this.connection.host,
        name: this.connection.name,
      },
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Метрики системы (Prometheus формат)' })
  @ApiResponse({ status: 200, description: 'Метрики в формате Prometheus' })
  metrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const metrics = `
# HELP nodejs_heap_size_total_bytes Total heap size
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes ${memoryUsage.heapTotal}

# HELP nodejs_heap_size_used_bytes Used heap size
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes ${memoryUsage.heapUsed}

# HELP nodejs_external_memory_bytes External memory
# TYPE nodejs_external_memory_bytes gauge
nodejs_external_memory_bytes ${memoryUsage.external}

# HELP nodejs_process_uptime_seconds Uptime in seconds
# TYPE nodejs_process_uptime_seconds gauge
nodejs_process_uptime_seconds ${uptime}

# HELP mongodb_connection_status MongoDB connection status (1 = connected)
# TYPE mongodb_connection_status gauge
mongodb_connection_status ${this.connection.readyState === 1 ? 1 : 0}
    `.trim();

    return metrics;
  }
}
