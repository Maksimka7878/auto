import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as nodemailer from 'nodemailer';

export interface NotificationPayload {
  workflowId: string;
  workflowName: string;
  executionId: string;
  error: string;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter(): void {
    const smtpConfig = this.configService.get('smtp');
    if (smtpConfig?.host && smtpConfig?.user) {
      this.emailTransporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.password,
        },
      });
    }
  }

  async sendExecutionFailureNotification(
    payload: NotificationPayload,
    email?: string,
    telegramChatId?: string,
  ): Promise<{ emailSent: boolean; telegramSent: boolean }> {
    const results = { emailSent: false, telegramSent: false };

    const promises: Promise<void>[] = [];

    if (email) {
      promises.push(
        this.sendEmailNotification(email, payload)
          .then(() => { results.emailSent = true; })
          .catch(err => {
            this.logger.error(`Failed to send email notification: ${err.message}`);
          })
      );
    }

    if (telegramChatId) {
      promises.push(
        this.sendTelegramNotification(telegramChatId, payload)
          .then(() => { results.telegramSent = true; })
          .catch(err => {
            this.logger.error(`Failed to send Telegram notification: ${err.message}`);
          })
      );
    }

    await Promise.all(promises);
    return results;
  }

  private async sendEmailNotification(to: string, payload: NotificationPayload): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email транспорт не настроен');
    }

    const smtpFrom = this.configService.get<string>('smtp.from') || 'noreply@automation.run';

    const subject = `⚠️ Ошибка выполнения: ${payload.workflowName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">⚠️ Ошибка выполнения автоматизации</h2>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Workflow:</strong> ${payload.workflowName}</p>
          <p><strong>ID выполнения:</strong> ${payload.executionId}</p>
          <p><strong>Время:</strong> ${payload.timestamp.toLocaleString('ru-RU')}</p>
          <p><strong>Попытка:</strong> ${payload.retryCount + 1} из ${payload.maxRetries}</p>
        </div>

        <div style="background: #fdf2f2; padding: 15px; border-left: 4px solid #e74c3c; margin: 20px 0;">
          <strong>Ошибка:</strong><br>
          <code style="font-size: 14px;">${payload.error}</code>
        </div>

        ${payload.retryCount < payload.maxRetries - 1
          ? `<p style="color: #666;">Система автоматически повторит выполнение.</p>`
          : `<p style="color: #e74c3c;"><strong>Достигнуто максимальное количество попыток.</strong></p>`
        }

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          Это автоматическое уведомление от AUTOMATION.RUN
        </p>
      </div>
    `;

    await this.emailTransporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html,
    });

    this.logger.debug(`Email notification sent to ${to}`);
  }

  private async sendTelegramNotification(chatId: string, payload: NotificationPayload): Promise<void> {
    const botToken = this.configService.get<string>('telegram.botToken');
    if (!botToken) {
      throw new Error('Telegram Bot Token не настроен');
    }

    const message = `
⚠️ <b>Ошибка выполнения</b>

<b>Workflow:</b> ${this.escapeHtml(payload.workflowName)}
<b>ID:</b> <code>${payload.executionId}</code>
<b>Время:</b> ${payload.timestamp.toLocaleString('ru-RU')}
<b>Попытка:</b> ${payload.retryCount + 1}/${payload.maxRetries}

<b>Ошибка:</b>
<code>${this.escapeHtml(payload.error.slice(0, 500))}</code>

${payload.retryCount < payload.maxRetries - 1
  ? '🔄 Будет выполнена повторная попытка'
  : '❌ Достигнут лимит попыток'
}`.trim();

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    });

    this.logger.debug(`Telegram notification sent to chat ${chatId}`);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async testEmailNotification(to: string): Promise<boolean> {
    if (!this.emailTransporter) {
      throw new Error('Email транспорт не настроен');
    }

    try {
      await this.emailTransporter.sendMail({
        from: this.configService.get<string>('smtp.from') || 'noreply@automation.run',
        to,
        subject: '✅ Тест уведомлений AUTOMATION.RUN',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>✅ Уведомления настроены!</h2>
            <p>Если вы видите это письмо, email уведомления работают корректно.</p>
          </div>
        `,
      });
      return true;
    } catch (error) {
      this.logger.error(`Test email failed: ${error}`);
      return false;
    }
  }

  async testTelegramNotification(chatId: string): Promise<boolean> {
    const botToken = this.configService.get<string>('telegram.botToken');
    if (!botToken) {
      throw new Error('Telegram Bot Token не настроен');
    }

    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: '✅ Уведомления AUTOMATION.RUN настроены корректно!',
      });
      return true;
    } catch (error) {
      this.logger.error(`Test Telegram failed: ${error}`);
      return false;
    }
  }
}
