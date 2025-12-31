import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsBoolean, IsNumber, MaxLength, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { TemplateCategory } from '../schemas/template.schema';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Уведомление в Telegram при новой заявке' })
  @IsString()
  @IsNotEmpty({ message: 'Название обязательно' })
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: 'Автоматически отправляет сообщение в Telegram при получении новой заявки через webhook' })
  @IsString()
  @IsNotEmpty({ message: 'Описание обязательно' })
  @MaxLength(2000)
  description: string;

  @ApiProperty({ enum: TemplateCategory })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  nodes?: any[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  connections?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  variables?: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  iconUrl?: string;

  @ApiPropertyOptional({ enum: ['beginner', 'intermediate', 'advanced'] })
  @IsString()
  @IsOptional()
  difficulty?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  estimatedSetupTime?: number;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredIntegrations?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}
