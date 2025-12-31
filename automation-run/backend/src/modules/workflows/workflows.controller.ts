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
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { WorkflowVersionService } from './workflow-version.service';
import { WorkflowExportService, WorkflowImportData } from './workflow-export.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/request.interface';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly versionService: WorkflowVersionService,
    private readonly exportService: WorkflowExportService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Создать новую автоматизацию' })
  @ApiResponse({ status: 201, description: 'Автоматизация создана' })
  async create(@Req() req: AuthenticatedRequest, @Body() createWorkflowDto: CreateWorkflowDto) {
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
    @Req() req: AuthenticatedRequest,
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
  async findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.workflowsService.findById(id, req.user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить автоматизацию' })
  @ApiResponse({ status: 200, description: 'Автоматизация обновлена' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(id, req.user.sub, updateWorkflowDto);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Активировать автоматизацию' })
  @ApiResponse({ status: 200, description: 'Автоматизация активирована' })
  async activate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.workflowsService.activate(id, req.user.sub);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Деактивировать автоматизацию' })
  @ApiResponse({ status: 200, description: 'Автоматизация деактивирована' })
  async deactivate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.workflowsService.deactivate(id, req.user.sub);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Дублировать автоматизацию' })
  @ApiResponse({ status: 201, description: 'Автоматизация скопирована' })
  async duplicate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.workflowsService.duplicate(id, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить автоматизацию' })
  @ApiResponse({ status: 204, description: 'Автоматизация удалена' })
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.workflowsService.delete(id, req.user.sub);
  }

  // Version management endpoints
  @Get(':id/versions')
  @ApiOperation({ summary: 'Получить историю версий автоматизации' })
  @ApiResponse({ status: 200, description: 'Список версий' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getVersions(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Verify user owns the workflow
    await this.workflowsService.findById(id, req.user.sub);
    return this.versionService.getVersions(id, { page, limit });
  }

  @Get(':id/versions/:version')
  @ApiOperation({ summary: 'Получить конкретную версию' })
  @ApiResponse({ status: 200, description: 'Данные версии' })
  async getVersion(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('version') version: number,
  ) {
    await this.workflowsService.findById(id, req.user.sub);
    return this.versionService.getVersion(id, version);
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Создать новую версию (сохранить текущее состояние)' })
  @ApiResponse({ status: 201, description: 'Версия создана' })
  async createVersion(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { changeDescription?: string },
  ) {
    await this.workflowsService.findById(id, req.user.sub);
    return this.versionService.createVersion(id, req.user.sub, body.changeDescription);
  }

  @Post(':id/versions/:version/rollback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Откатить к указанной версии' })
  @ApiResponse({ status: 200, description: 'Workflow откачен к версии' })
  async rollbackToVersion(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('version') version: number,
  ) {
    await this.workflowsService.findById(id, req.user.sub);
    return this.versionService.rollback(id, version, req.user.sub);
  }

  @Get(':id/versions/compare')
  @ApiOperation({ summary: 'Сравнить две версии' })
  @ApiResponse({ status: 200, description: 'Результат сравнения' })
  @ApiQuery({ name: 'v1', required: true })
  @ApiQuery({ name: 'v2', required: true })
  async compareVersions(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('v1') v1: number,
    @Query('v2') v2: number,
  ) {
    await this.workflowsService.findById(id, req.user.sub);
    return this.versionService.compareVersions(id, v1, v2);
  }

  // Export/Import endpoints
  @Get(':id/export')
  @ApiOperation({ summary: 'Экспортировать автоматизацию в JSON' })
  @ApiResponse({ status: 200, description: 'JSON данные автоматизации' })
  async exportWorkflow(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.exportService.exportWorkflow(id, req.user.sub);
  }

  @Post('import')
  @ApiOperation({ summary: 'Импортировать автоматизацию из JSON' })
  @ApiResponse({ status: 201, description: 'Автоматизация импортирована' })
  async importWorkflow(
    @Req() req: AuthenticatedRequest,
    @Body() importData: WorkflowImportData,
  ) {
    return this.exportService.importWorkflow(importData, req.user.sub);
  }

  @Post(':id/import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить автоматизацию из JSON (перезаписать)' })
  @ApiResponse({ status: 200, description: 'Автоматизация обновлена' })
  async updateFromImport(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() importData: WorkflowImportData,
  ) {
    return this.exportService.importWorkflow(importData, req.user.sub, {
      overwrite: true,
      workflowId: id,
    });
  }
}
