import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Новое имя' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  settings?: {
    notifications?: {
      email?: boolean;
      telegram?: boolean;
    };
    timezone?: string;
    language?: string;
  };
}
