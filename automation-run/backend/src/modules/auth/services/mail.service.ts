import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('smtp.host'),
      port: this.configService.get<number>('smtp.port'),
      secure: this.configService.get<boolean>('smtp.secure'),
      auth: {
        user: this.configService.get<string>('smtp.user'),
        pass: this.configService.get<string>('smtp.password'),
      },
    });

    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  /**
   * Отправка email верификации
   */
  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AUTOMATION.RUN</h1>
            <p>Подтверждение email</p>
          </div>
          <div class="content">
            <p>Привет, ${name}!</p>
            <p>Спасибо за регистрацию на платформе AUTOMATION.RUN. Для завершения регистрации подтвердите ваш email адрес:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Подтвердить Email</a>
            </p>
            <p>Или скопируйте эту ссылку в браузер:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
            <p>Ссылка действительна 24 часа.</p>
            <p>Если вы не регистрировались на нашей платформе, просто проигнорируйте это письмо.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} AUTOMATION.RUN. Все права защищены.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('smtp.from'),
        to: email,
        subject: 'Подтверждение email - AUTOMATION.RUN',
        html,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * Отправка email для сброса пароля
   */
  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AUTOMATION.RUN</h1>
            <p>Сброс пароля</p>
          </div>
          <div class="content">
            <p>Привет, ${name}!</p>
            <p>Вы запросили сброс пароля для вашего аккаунта. Нажмите кнопку ниже для создания нового пароля:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Сбросить пароль</a>
            </p>
            <p>Или скопируйте эту ссылку в браузер:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Важно:</strong> Ссылка действительна только 1 час.
            </div>
            <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо. Ваш пароль останется прежним.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} AUTOMATION.RUN. Все права защищены.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('smtp.from'),
        to: email,
        subject: 'Сброс пароля - AUTOMATION.RUN',
        html,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * Отправка уведомления об успешной верификации
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #11998e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
          .features { background: white; padding: 20px; border-radius: 5px; margin: 15px 0; }
          .feature { padding: 10px 0; border-bottom: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Добро пожаловать!</h1>
            <p>AUTOMATION.RUN</p>
          </div>
          <div class="content">
            <p>Привет, ${name}!</p>
            <p>Ваш email успешно подтверждён. Теперь вы можете использовать все возможности платформы!</p>

            <div class="features">
              <h3>Что вы можете сделать:</h3>
              <div class="feature">✅ Создавать автоматизации без кода</div>
              <div class="feature">✅ Подключать интеграции (Email, Telegram, Slack и др.)</div>
              <div class="feature">✅ Настраивать триггеры и расписания</div>
              <div class="feature">✅ Отслеживать историю выполнений</div>
            </div>

            <p style="text-align: center;">
              <a href="${this.frontendUrl}/dashboard" class="button">Начать работу</a>
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} AUTOMATION.RUN. Все права защищены.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('smtp.from'),
        to: email,
        subject: 'Добро пожаловать в AUTOMATION.RUN!',
        html,
      });
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error.message);
    }
  }
}
