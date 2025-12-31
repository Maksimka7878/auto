import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/request.interface';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Получить текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Данные пользователя' })
  async getMe(@Req() req: AuthenticatedRequest) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    const userAny = user as any;
    const userObj = userAny.toObject ? userAny.toObject() : user;
    const { password, ...result } = userObj;
    return result;
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Получить статистику пользователя' })
  @ApiResponse({ status: 200, description: 'Статистика использования' })
  async getStats(@Req() req: AuthenticatedRequest) {
    return this.usersService.getUserStats(req.user.sub);
  }

  @Put('me')
  @ApiOperation({ summary: 'Обновить профиль' })
  @ApiResponse({ status: 200, description: 'Профиль обновлен' })
  async updateMe(@Req() req: AuthenticatedRequest, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.sub, updateUserDto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Удалить аккаунт' })
  @ApiResponse({ status: 200, description: 'Аккаунт удален' })
  async deleteMe(@Req() req: AuthenticatedRequest) {
    await this.usersService.delete(req.user.sub);
    return { message: 'Аккаунт успешно удален' };
  }
}
