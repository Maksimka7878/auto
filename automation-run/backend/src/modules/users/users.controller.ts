import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Получить текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Данные пользователя' })
  async getMe(@Request() req) {
    const user = await this.usersService.findById(req.user.sub);
    const { password, ...result } = user.toObject();
    return result;
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Получить статистику пользователя' })
  @ApiResponse({ status: 200, description: 'Статистика использования' })
  async getStats(@Request() req) {
    return this.usersService.getUserStats(req.user.sub);
  }

  @Put('me')
  @ApiOperation({ summary: 'Обновить профиль' })
  @ApiResponse({ status: 200, description: 'Профиль обновлен' })
  async updateMe(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.sub, updateUserDto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Удалить аккаунт' })
  @ApiResponse({ status: 200, description: 'Аккаунт удален' })
  async deleteMe(@Request() req) {
    await this.usersService.delete(req.user.sub);
    return { message: 'Аккаунт успешно удален' };
  }
}
