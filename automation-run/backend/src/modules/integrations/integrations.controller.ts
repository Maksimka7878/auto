import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntegrationsController {
  @Get('available')
  @ApiOperation({ summary: 'Получить список доступных интеграций' })
  @ApiResponse({ status: 200, description: 'Список интеграций' })
  getAvailableIntegrations() {
    return {
      triggers: [
        {
          type: 'webhook',
          name: 'Webhook',
          description: 'Запуск по HTTP запросу',
          icon: 'webhook',
          config: [
            { name: 'method', type: 'select', options: ['GET', 'POST', 'PUT'], default: 'POST' },
          ],
        },
        {
          type: 'schedule',
          name: 'Расписание',
          description: 'Запуск по расписанию',
          icon: 'clock',
          config: [
            { name: 'cronExpression', type: 'cron', label: 'Cron выражение' },
            { name: 'timezone', type: 'select', options: ['Europe/Moscow', 'UTC'], default: 'Europe/Moscow' },
          ],
        },
        {
          type: 'email_received',
          name: 'Получение Email',
          description: 'Запуск при получении письма',
          icon: 'mail',
          config: [
            { name: 'fromFilter', type: 'text', label: 'Фильтр по отправителю' },
            { name: 'subjectFilter', type: 'text', label: 'Фильтр по теме' },
          ],
        },
        {
          type: 'form_submission',
          name: 'Отправка формы',
          description: 'Запуск при отправке формы',
          icon: 'form',
          config: [
            { name: 'formId', type: 'text', label: 'ID формы' },
          ],
        },
      ],
      actions: [
        {
          type: 'send_email',
          name: 'Отправить Email',
          description: 'Отправка электронного письма',
          icon: 'mail',
          config: [
            { name: 'to', type: 'text', label: 'Кому', required: true },
            { name: 'subject', type: 'text', label: 'Тема', required: true },
            { name: 'body', type: 'textarea', label: 'Текст письма', required: true },
            { name: 'isHtml', type: 'boolean', label: 'HTML формат', default: false },
          ],
        },
        {
          type: 'send_telegram',
          name: 'Telegram сообщение',
          description: 'Отправка сообщения в Telegram',
          icon: 'telegram',
          config: [
            { name: 'chatId', type: 'text', label: 'Chat ID', required: true },
            { name: 'message', type: 'textarea', label: 'Сообщение', required: true },
            { name: 'parseMode', type: 'select', options: ['HTML', 'Markdown'], default: 'HTML' },
          ],
        },
        {
          type: 'send_slack',
          name: 'Slack сообщение',
          description: 'Отправка сообщения в Slack',
          icon: 'slack',
          config: [
            { name: 'channel', type: 'text', label: 'Канал', required: true },
            { name: 'text', type: 'textarea', label: 'Текст', required: true },
          ],
        },
        {
          type: 'http_request',
          name: 'HTTP запрос',
          description: 'Выполнение HTTP запроса',
          icon: 'http',
          config: [
            { name: 'url', type: 'text', label: 'URL', required: true },
            { name: 'method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'GET' },
            { name: 'headers', type: 'json', label: 'Заголовки' },
            { name: 'body', type: 'json', label: 'Тело запроса' },
          ],
        },
        {
          type: 'google_sheets',
          name: 'Google Sheets',
          description: 'Работа с Google Таблицами',
          icon: 'sheets',
          config: [
            { name: 'action', type: 'select', options: ['append', 'read', 'update'], default: 'append' },
            { name: 'spreadsheetId', type: 'text', label: 'ID таблицы', required: true },
            { name: 'range', type: 'text', label: 'Диапазон', required: true },
            { name: 'values', type: 'json', label: 'Данные' },
          ],
        },
        {
          type: 'database',
          name: 'База данных',
          description: 'Операции с базой данных',
          icon: 'database',
          config: [
            { name: 'action', type: 'select', options: ['insert', 'update', 'delete', 'find'], default: 'find' },
            { name: 'collection', type: 'text', label: 'Коллекция', required: true },
            { name: 'query', type: 'json', label: 'Запрос' },
            { name: 'data', type: 'json', label: 'Данные' },
          ],
        },
      ],
      logic: [
        {
          type: 'if_else',
          name: 'Условие IF/ELSE',
          description: 'Ветвление логики',
          icon: 'condition',
          config: [
            { name: 'leftOperand', type: 'text', label: 'Левый операнд', required: true },
            { name: 'operator', type: 'select', options: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'], default: 'equals' },
            { name: 'rightOperand', type: 'text', label: 'Правый операнд' },
          ],
          outputs: ['true', 'false'],
        },
        {
          type: 'delay',
          name: 'Задержка',
          description: 'Пауза выполнения',
          icon: 'timer',
          config: [
            { name: 'duration', type: 'number', label: 'Длительность', required: true },
            { name: 'unit', type: 'select', options: ['seconds', 'minutes', 'hours'], default: 'seconds' },
          ],
        },
        {
          type: 'loop',
          name: 'Цикл',
          description: 'Итерация по массиву',
          icon: 'loop',
          config: [
            { name: 'source', type: 'text', label: 'Источник данных', required: true },
            { name: 'maxIterations', type: 'number', label: 'Макс. итераций', default: 100 },
          ],
        },
        {
          type: 'transform',
          name: 'Преобразование',
          description: 'Трансформация данных',
          icon: 'transform',
          config: [
            { name: 'operation', type: 'select', options: ['map', 'filter', 'json_parse', 'json_stringify', 'to_upper', 'to_lower'], default: 'map' },
            { name: 'input', type: 'text', label: 'Входные данные', required: true },
            { name: 'mappings', type: 'json', label: 'Маппинги' },
          ],
        },
      ],
    };
  }
}
