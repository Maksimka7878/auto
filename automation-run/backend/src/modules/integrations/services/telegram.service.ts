import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private botToken: string;
  private apiUrl: string;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.botToken') || '';
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async send(config: {
    chatId: string;
    message: string;
    parseMode?: 'HTML' | 'Markdown';
  }): Promise<{ sent: boolean; messageId?: number }> {
    if (!this.botToken) {
      throw new Error('Telegram Bot Token не настроен');
    }

    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: config.chatId,
        text: config.message,
        parse_mode: config.parseMode || 'HTML',
      });

      return {
        sent: true,
        messageId: response.data.result?.message_id,
      };
    } catch (error: any) {
      console.error('Telegram send error:', error.response?.data || error.message);
      throw new Error(`Ошибка отправки Telegram: ${error.response?.data?.description || error.message}`);
    }
  }

  async sendPhoto(config: {
    chatId: string;
    photoUrl: string;
    caption?: string;
  }): Promise<{ sent: boolean; messageId?: number }> {
    try {
      const response = await axios.post(`${this.apiUrl}/sendPhoto`, {
        chat_id: config.chatId,
        photo: config.photoUrl,
        caption: config.caption,
      });

      return {
        sent: true,
        messageId: response.data.result?.message_id,
      };
    } catch (error: any) {
      throw new Error(`Ошибка отправки фото: ${error.message}`);
    }
  }

  async getMe(): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/getMe`);
      return response.data.result;
    } catch (error: any) {
      throw new Error(`Ошибка получения информации о боте: ${error.message}`);
    }
  }
}
