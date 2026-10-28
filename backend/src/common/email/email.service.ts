import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailer: MailerService) {}

  /** Yangi foydalanuvchiga kirish ma'lumotlarini yuboradi. Xato bo'lsa false qaytaradi (throw qilmaydi). */
  async sendEmail(email: string, login: string, password: string): Promise<boolean> {
    return this.send(
      email,
      'CRM tizimiga kirish',
      `<p>CRM tizimiga kirish ma'lumotlaringiz:</p>
       <p><b>Login:</b> ${login}<br/><b>Parol:</b> ${password}</p>
       <p>Birinchi kirishda parolni almashtirishingiz talab qilinadi.</p>`,
    );
  }

  async sendOtpEmail(email: string, code: string): Promise<boolean> {
    return this.send(
      email,
      'Tasdiqlash kodi',
      `<p>Tasdiqlash kodi: <b>${code}</b></p><p>Kod 3 daqiqa amal qiladi.</p>`,
    );
  }

  private async send(to: string, subject: string, html: string): Promise<boolean> {
    try {
      await this.mailer.sendMail({ to, subject, html });
      return true;
    } catch (error) {
      this.logger.error(
        `Email yuborilmadi (${to}): ${error instanceof Error ? error.message : error}`,
      );
      return false;
    }
  }
}
