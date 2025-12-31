import { IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Текущий пароль' })
  @IsString()
  @IsNotEmpty({ message: 'Текущий пароль обязателен' })
  @MaxLength(72, { message: 'Пароль не должен превышать 72 символа' })
  oldPassword: string;

  @ApiProperty({
    description: 'Новый пароль (8-72 символов, должен содержать заглавную букву, строчную букву, цифру и специальный символ)'
  })
  @IsString()
  @MinLength(8, { message: 'Новый пароль должен содержать минимум 8 символов' })
  @MaxLength(72, { message: 'Новый пароль не должен превышать 72 символа' })
  @Matches(/[A-Z]/, { message: 'Пароль должен содержать хотя бы одну заглавную букву' })
  @Matches(/[a-z]/, { message: 'Пароль должен содержать хотя бы одну строчную букву' })
  @Matches(/[0-9]/, { message: 'Пароль должен содержать хотя бы одну цифру' })
  @Matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, { message: 'Пароль должен содержать хотя бы один специальный символ' })
  @IsNotEmpty({ message: 'Новый пароль обязателен' })
  newPassword: string;
}
