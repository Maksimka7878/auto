import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

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
  }

  async send(config: {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
  }): Promise<{ sent: boolean; messageId?: string }> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: this.configService.get<string>('smtp.from'),
        to: config.to,
        subject: config.subject,
      };

      if (config.isHtml) {
        mailOptions.html = config.body;
      } else {
        mailOptions.text = config.body;
      }

      const info = await this.transporter.sendMail(mailOptions);

      return {
        sent: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Ошибка отправки email: ${error.message}`);
    }
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
