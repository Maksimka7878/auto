import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новую автоматизацию' })
  @ApiResponse({ status: 201, description: 'Автоматизация создана' })
  async create(@Request() req, @Body() createWorkflowDto: CreateWorkflowDto) {
    return this.workflowsService.create(req.user.sub, createWorkflowDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список автоматизаций' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Список автоматизаций' })
  async findAll(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.workflowsService.findAll(req.user.sub, {
      page,
      limit,
      status,
      isActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить автоматизацию по ID' })
  @ApiResponse({ status: 200, description: 'Данные автоматизации' })
  @ApiResponse({ status: 404, description: 'Автоматизация не найдена' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.workflowsService.findById(id, req.user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить автоматизацию' })
  @ApiResponse({ status: 200, description: 'Автоматизация обновлена' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(id, req.user.sub, updateWorkflowDto);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Активировать автоматизацию' })
  @ApiResponse({ status: 200, description: 'Автоматизация активирована' })
  async activate(@Request() req, @Param('id') id: string) {
    return this.workflowsService.activate(id, req.user.sub);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Деактивировать автоматизацию' })
  @ApiResponse({ status: 200, description: 'Автоматизация деактивирована' })
  async deactivate(@Request() req, @Param('id') id: string) {
    return this.workflowsService.deactivate(id, req.user.sub);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Дублировать автоматизацию' })
  @ApiResponse({ status: 201, description: 'Автоматизация скопирована' })
  async duplicate(@Request() req, @Param('id') id: string) {
    return this.workflowsService.duplicate(id, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить автоматизацию' })
  @ApiResponse({ status: 204, description: 'Автоматизация удалена' })
  async remove(@Request() req, @Param('id') id: string) {
    await this.workflowsService.delete(id, req.user.sub);
  }
}
