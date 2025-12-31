import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ExecutionsService } from './executions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExecutionStatus } from './schemas/execution.schema';

@ApiTags('executions')
@Controller('executions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить историю выполнений' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'workflowId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ExecutionStatus })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'История выполнений' })
  async findAll(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('workflowId') workflowId?: string,
    @Query('status') status?: ExecutionStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.executionsService.findAll(req.user.sub, {
      page,
      limit,
      workflowId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику выполнений' })
  @ApiQuery({ name: 'workflowId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Статистика' })
  async getStats(@Request() req, @Query('workflowId') workflowId?: string) {
    return this.executionsService.getStats(req.user.sub, workflowId);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Получить активность по дням' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Активность' })
  async getActivity(@Request() req, @Query('days') days?: number) {
    return this.executionsService.getActivityStats(req.user.sub, days || 30);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить детали выполнения' })
  @ApiResponse({ status: 200, description: 'Детали выполнения' })
  @ApiResponse({ status: 404, description: 'Выполнение не найдено' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.executionsService.findById(id, req.user.sub);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отменить выполнение' })
  @ApiResponse({ status: 200, description: 'Выполнение отменено' })
  async cancel(@Request() req, @Param('id') id: string) {
    return this.executionsService.cancel(id, req.user.sub);
  }
}
