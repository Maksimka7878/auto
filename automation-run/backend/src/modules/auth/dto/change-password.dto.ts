import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Текущий пароль' })
  @IsString()
  @IsNotEmpty({ message: 'Текущий пароль обязателен' })
  oldPassword: string;

  @ApiProperty({ description: 'Новый пароль (минимум 8 символов)' })
  @IsString()
  @MinLength(8, { message: 'Новый пароль должен содержать минимум 8 символов' })
  @IsNotEmpty({ message: 'Новый пароль обязателен' })
  newPassword: string;
}
