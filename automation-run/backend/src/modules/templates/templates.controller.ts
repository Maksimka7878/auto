import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TemplatesService, TemplateFilters } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TemplateCategory } from './schemas/template.schema';
import { AuthenticatedRequest } from '../../common/types/request.interface';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список шаблонов' })
  @ApiResponse({ status: 200, description: 'Список шаблонов' })
  @ApiQuery({ name: 'category', required: false, enum: TemplateCategory })
  @ApiQuery({ name: 'difficulty', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('category') category?: TemplateCategory,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const filters: TemplateFilters = {
      category,
      difficulty,
      search,
      tags: tags ? tags.split(',') : undefined,
    };
    return this.templatesService.findAll(filters, { page, limit });
  }

  @Get('featured')
  @ApiOperation({ summary: 'Получить рекомендуемые шаблоны' })
  @ApiResponse({ status: 200, description: 'Рекомендуемые шаблоны' })
  async getFeatured() {
    return this.templatesService.getFeatured();
  }

  @Get('popular')
  @ApiOperation({ summary: 'Получить популярные шаблоны' })
  @ApiResponse({ status: 200, description: 'Популярные шаблоны' })
  @ApiQuery({ name: 'limit', required: false })
  async getPopular(@Query('limit') limit?: number) {
    return this.templatesService.getPopular(limit || 10);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Получить категории шаблонов' })
  @ApiResponse({ status: 200, description: 'Категории с количеством шаблонов' })
  async getCategories() {
    return this.templatesService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить шаблон по ID' })
  @ApiResponse({ status: 200, description: 'Шаблон' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async findById(@Param('id') id: string) {
    return this.templatesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать шаблон (для администраторов)' })
  @ApiResponse({ status: 201, description: 'Шаблон создан' })
  async create(
    @Body() createTemplateDto: CreateTemplateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.templatesService.create(createTemplateDto, req.user.sub);
  }

  @Post(':id/use')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Использовать шаблон (увеличить счетчик)' })
  @ApiResponse({ status: 200, description: 'Счетчик обновлен' })
  async useTemplate(@Param('id') id: string) {
    await this.templatesService.incrementUsage(id);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить шаблон (для администраторов)' })
  @ApiResponse({ status: 200, description: 'Шаблон удален' })
  async delete(@Param('id') id: string) {
    await this.templatesService.delete(id);
    return { success: true };
  }
}
