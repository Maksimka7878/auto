import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, MaxLength, IsNumber, ArrayMaxSize, Matches } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class NodePositionDto {
  @ApiProperty()
  @IsNumber()
  x: number;

  @ApiProperty()
  @IsNumber()
  y: number;
}

export class WorkflowNodeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100, { message: 'ID узла не должен превышать 100 символов' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'ID узла может содержать только буквы, цифры, подчеркивания и дефисы' })
  id: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50, { message: 'Тип узла не должен превышать 50 символов' })
  type: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200, { message: 'Имя узла не должно превышать 200 символов' })
  @Transform(({ value }) => value?.trim())
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
  @MaxLength(100, { message: 'ID соединения не должен превышать 100 символов' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'ID соединения может содержать только буквы, цифры, подчеркивания и дефисы' })
  id: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100, { message: 'ID источника не должен превышать 100 символов' })
  sourceId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100, { message: 'ID цели не должен превышать 100 символов' })
  targetId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sourceHandle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  targetHandle?: string;
}

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Моя автоматизация' })
  @IsString()
  @IsNotEmpty({ message: 'Название обязательно' })
  @MaxLength(200, { message: 'Название не должно превышать 200 символов' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: 'Описание автоматизации' })
  @IsString()
  @IsOptional()
  @MaxLength(2000, { message: 'Описание не должно превышать 2000 символов' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  @IsOptional()
  @ArrayMaxSize(500, { message: 'Workflow не может содержать более 500 узлов' })
  nodes?: WorkflowNodeDto[];

  @ApiPropertyOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NodeConnectionDto)
  @IsOptional()
  @ArrayMaxSize(1000, { message: 'Workflow не может содержать более 1000 соединений' })
  connections?: NodeConnectionDto[];

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(20, { message: 'Нельзя добавить более 20 тегов' })
  @MaxLength(50, { each: true, message: 'Каждый тег не должен превышать 50 символов' })
  tags?: string[];
}
