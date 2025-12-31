import { Injectable } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { TelegramService } from './services/telegram.service';
import { SlackService } from './services/slack.service';
import { HttpService } from './services/http.service';
import { GoogleSheetsService } from './services/google-sheets.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly emailService: EmailService,
    private readonly telegramService: TelegramService,
    private readonly slackService: SlackService,
    private readonly httpService: HttpService,
    private readonly googleSheetsService: GoogleSheetsService,
  ) {}

  async sendEmail(config: {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
  }): Promise<{ sent: boolean; messageId?: string }> {
    return this.emailService.send(config);
  }

  async sendTelegram(config: {
    chatId: string;
    message: string;
    parseMode?: 'HTML' | 'Markdown';
  }): Promise<{ sent: boolean; messageId?: number }> {
    return this.telegramService.send(config);
  }

  async sendSlack(config: {
    channel: string;
    text: string;
    blocks?: any[];
  }): Promise<{ sent: boolean; ts?: string }> {
    return this.slackService.send(config);
  }

  async httpRequest(config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
  }): Promise<{ status: number; data: any; headers: Record<string, string> }> {
    return this.httpService.request(config);
  }

  async googleSheets(config: {
    action: 'append' | 'read' | 'update';
    spreadsheetId: string;
    range: string;
    values?: any[][];
    credentials: any;
  }): Promise<{ success: boolean; data?: any }> {
    return this.googleSheetsService.execute(config);
  }

  async database(config: {
    action: 'insert' | 'update' | 'delete' | 'find';
    connectionString: string;
    collection: string;
    query?: any;
    data?: any;
  }): Promise<{ success: boolean; result?: any }> {
    // Placeholder for database operations
    // In production, you would implement MongoDB/PostgreSQL connections here
    return { success: true, result: {} };
  }
}
