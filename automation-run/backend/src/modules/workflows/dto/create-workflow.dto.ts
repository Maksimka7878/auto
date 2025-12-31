import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class NodePositionDto {
  @ApiProperty()
  x: number;

  @ApiProperty()
  y: number;
}

export class WorkflowNodeDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => NodePositionDto)
  position: NodePositionDto;

  @ApiPropertyOptional()
  @IsOptional()
  config?: Record<string, any>;
}

export class NodeConnectionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  sourceId: string;

  @ApiProperty()
  @IsString()
  targetId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sourceHandle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  targetHandle?: string;
}

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Моя автоматизация' })
  @IsString()
  @IsNotEmpty({ message: 'Название обязательно' })
  name: string;

  @ApiPropertyOptional({ example: 'Описание автоматизации' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  @IsOptional()
  nodes?: WorkflowNodeDto[];

  @ApiPropertyOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NodeConnectionDto)
  @IsOptional()
  connections?: NodeConnectionDto[];

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
