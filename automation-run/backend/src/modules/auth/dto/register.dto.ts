import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email пользователя' })
  @IsEmail({}, { message: 'Некорректный формат email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  @MaxLength(255, { message: 'Email не должен превышать 255 символов' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    example: 'SecureP@ss123',
    description: 'Пароль (8-72 символов, должен содержать заглавную букву, строчную букву, цифру и специальный символ)'
  })
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @MaxLength(72, { message: 'Пароль не должен превышать 72 символа' }) // bcrypt limit
  @Matches(/[A-Z]/, { message: 'Пароль должен содержать хотя бы одну заглавную букву' })
  @Matches(/[a-z]/, { message: 'Пароль должен содержать хотя бы одну строчную букву' })
  @Matches(/[0-9]/, { message: 'Пароль должен содержать хотя бы одну цифру' })
  @Matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, { message: 'Пароль должен содержать хотя бы один специальный символ' })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  password: string;

  @ApiProperty({ example: 'Иван Петров', description: 'Имя пользователя (2-100 символов)' })
  @IsString()
  @IsNotEmpty({ message: 'Имя обязательно' })
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  @MaxLength(100, { message: 'Имя не должно превышать 100 символов' })
  @Transform(({ value }) => value?.trim())
  name: string;
}
