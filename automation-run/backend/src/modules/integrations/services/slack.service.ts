import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SlackService {
  constructor(private configService: ConfigService) {}

  async send(config: {
    channel: string;
    text: string;
    blocks?: any[];
    token?: string;
  }): Promise<{ sent: boolean; ts?: string }> {
    const token = config.token || this.configService.get<string>('slack.botToken');

    if (!token) {
      throw new Error('Slack Bot Token не настроен');
    }

    try {
      const payload: any = {
        channel: config.channel,
        text: config.text,
      };

      if (config.blocks) {
        payload.blocks = config.blocks;
      }

      const response = await axios.post(
        'https://slack.com/api/chat.postMessage',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.ok) {
        throw new Error(response.data.error);
      }

      return {
        sent: true,
        ts: response.data.ts,
      };
    } catch (error) {
      console.error('Slack send error:', error.response?.data || error.message);
      throw new Error(`Ошибка отправки Slack: ${error.message}`);
    }
  }

  async sendWebhook(config: {
    webhookUrl: string;
    text: string;
    blocks?: any[];
  }): Promise<{ sent: boolean }> {
    try {
      const payload: any = { text: config.text };

      if (config.blocks) {
        payload.blocks = config.blocks;
      }

      await axios.post(config.webhookUrl, payload);

      return { sent: true };
    } catch (error) {
      throw new Error(`Ошибка отправки через Webhook: ${error.message}`);
    }
  }
}
