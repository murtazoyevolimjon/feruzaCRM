import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/** Telefonni 998XXXXXXXXX ko'rinishiga keltiradi. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 9 ? `998${digits}` : digits;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private eskizToken: string | null = null;

  constructor(private readonly config: ConfigService) {}

  async sendOtpCode(phone: string, code: string): Promise<void> {
    const message = `Tasdiqlash kodi: ${code}. Kod 3 daqiqa amal qiladi.`;
    const provider = this.config.get<string>('SMS_PROVIDER') ?? 'mock';

    if (provider === 'eskiz') {
      await this.sendViaEskiz(normalizePhone(phone), message);
      return;
    }

    // mock: kod faqat development muhitida logga yoziladi
    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.warn("SMS_PROVIDER=mock productionda ishlatilmoqda; SMS yuborilmadi");
      return;
    }
    this.logger.log(`[MOCK SMS] ${normalizePhone(phone)}: ${message}`);
  }

  private async login(): Promise<string> {
    const base = this.config.getOrThrow<string>('SMS_ESKIZ_BASE_URL');
    const form = new URLSearchParams({
      email: this.config.getOrThrow<string>('SMS_ESKIZ_EMAIL'),
      password: this.config.getOrThrow<string>('SMS_ESKIZ_PASSWORD'),
    });
    const { data } = await axios.post(`${base}/api/auth/login`, form);
    const token = data?.data?.token as string | undefined;
    if (!token) throw new InternalServerErrorException('SMS xizmatiga ulanib bo\'lmadi');
    this.eskizToken = token;
    return token;
  }

  private async sendViaEskiz(mobile: string, message: string, retry = true): Promise<void> {
    const base = this.config.getOrThrow<string>('SMS_ESKIZ_BASE_URL');
    const token = this.eskizToken ?? (await this.login());
    const form = new URLSearchParams({
      mobile_phone: mobile,
      message,
      from: this.config.get<string>('SMS_ESKIZ_FROM') ?? '4546',
    });
    try {
      await axios.post(`${base}/api/message/sms/send`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      if (retry && axios.isAxiosError(error) && error.response?.status === 401) {
        this.eskizToken = null;
        return this.sendViaEskiz(mobile, message, false);
      }
      this.logger.error('Eskiz SMS yuborilmadi');
      throw new InternalServerErrorException('SMS yuborib bo\'lmadi');
    }
  }
}
