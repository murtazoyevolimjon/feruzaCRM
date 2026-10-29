import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod, PaymentStatus, Prisma, Role, Status } from '@prisma/client';
import axios from 'axios';
import { randomBytes, randomInt } from 'crypto';
import { AuthUser } from '../../common/guard/auth-user';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Paging, pageArgs, pageMeta } from '../../common/utils/pagination';
import { SmsService } from '../../common/sms/sms.service';
import { ConfirmCardOtpDto, CreatePaymentDto, WebhookDto } from './dto/payment.dto';
import { verifyWebhookSignature } from './kyn-signature.util';

const OTP_TTL_SECONDS = 180;
const OTP_MAX_ATTEMPTS = 5;
const otpKey = (id: string) => `payment:otp:${id}`;

interface OtpSession {
  paymentId: number;
  studentId: number;
  code: string;
  attempts: number;
}

const formatUzs = (n: Prisma.Decimal | number) =>
  Number(n).toLocaleString('ru-RU').replace(/ /g, ' ');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly sms: SmsService,
  ) {}

  async create(dto: CreatePaymentDto, user: AuthUser) {
    // Talaba faqat o'zi uchun; admin istalgan talaba uchun (13.6)
    let studentId: number;
    if (user.role === Role.STUDENT) {
      studentId = user.id;
    } else {
      if (!dto.studentId) throw new BadRequestException('studentId majburiy');
      studentId = dto.studentId;
    }

    const membership = await this.prisma.studentGroup.findUnique({
      where: { id: dto.studentGroupId },
      include: { group: { include: { course: true } } },
    });
    if (!membership || membership.studentId !== studentId) {
      throw new ForbiddenException('Bu guruh a\'zoligi sizga tegishli emas');
    }
    if (membership.status !== Status.ACTIVE) {
      throw new BadRequestException('Guruh a\'zoligi faol emas');
    }
    // Bir martalik to'lov kursning umumiy narxidan (oylik narx × oylar) oshmasin
    const { price, durationMonth } = membership.group.course;
    if (dto.amount > Number(price) * durationMonth) {
      throw new BadRequestException("Summa kursning umumiy narxidan oshib ketdi");
    }

    const method = dto.paymentMethod ?? PaymentMethod.KYN;
    if (method === PaymentMethod.CASH && user.role === Role.STUDENT) {
      throw new ForbiddenException("Naqd to'lovni faqat admin qabul qila oladi");
    }
    const invoiceNumber = `INV-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const base = {
      studentGroupId: dto.studentGroupId,
      studentId,
      amount: dto.amount,
      description: dto.description,
      invoiceNumber,
      paymentMethod: method,
    };

    if (method === PaymentMethod.CASH) {
      // Kassada naqd qabul qilinadi: darhol yakunlanadi
      const payment = await this.prisma.payment.create({
        data: { ...base, status: PaymentStatus.COMPLETED, paidAt: new Date() },
      });
      return {
        success: true,
        message: "Naqd to'lov qabul qilindi",
        data: { ...payment, amount: Number(payment.amount) },
      };
    }
    if (method === PaymentMethod.CARD) return this.createCard(dto, base);
    if (method === PaymentMethod.KYN) return this.createKyn(base);

    const payment = await this.prisma.payment.create({ data: base });
    return { success: true, data: payment };
  }

  private async createKyn(base: Prisma.PaymentUncheckedCreateInput) {
    const apiUrl = this.config.getOrThrow<string>('KYN_API_URL');
    let paymentUrl: string | undefined;
    let kynTransactionId: string | undefined;
    try {
      const { data } = await axios.post(
        `${apiUrl}/payments`,
        {
          orderId: base.invoiceNumber,
          amount: Number(base.amount),
          description: base.description,
          returnUrl: this.config.get<string>('FRONTEND_URL'),
          callbackUrl: `${this.config.get<string>('BACKEND_URL')}/api/payments/webhook`,
        },
        { headers: { Authorization: `Bearer ${this.config.get<string>('KYN_API_KEY')}` }, timeout: 10_000 },
      );
      paymentUrl = data?.paymentUrl ?? data?.data?.paymentUrl;
      kynTransactionId = data?.transactionId ?? data?.data?.transactionId;
    } catch {
      this.logger.error(`KYN so'rovi muvaffaqiyatsiz: ${base.invoiceNumber}`);
      throw new BadRequestException("To'lov shlyuziga ulanib bo'lmadi");
    }
    if (!paymentUrl) throw new BadRequestException("To'lov havolasi olinmadi");

    const payment = await this.prisma.payment.create({
      data: { ...base, paymentUrl, kynTransactionId },
    });
    return { success: true, data: { ...payment, amount: Number(payment.amount) } };
  }

  private async createCard(dto: CreatePaymentDto, base: Prisma.PaymentUncheckedCreateInput) {
    if (!dto.cardLast4 || !dto.cardExpiry || !dto.phoneNumber) {
      throw new BadRequestException('Karta oxirgi 4 raqami, muddati va telefon majburiy');
    }
    const payment = await this.prisma.payment.create({
      data: {
        ...base,
        description: `${base.description ?? ''} (karta *${dto.cardLast4})`.trim(),
      },
    });

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const otpSessionId = randomBytes(16).toString('hex');
    const session: OtpSession = {
      paymentId: payment.id,
      studentId: payment.studentId,
      code,
      attempts: 0,
    };
    await this.redis.setex(otpKey(otpSessionId), OTP_TTL_SECONDS, JSON.stringify(session));
    await this.sms.sendOtpCode(dto.phoneNumber, code);

    const digits = dto.phoneNumber.replace(/\D/g, '');
    return {
      success: true,
      message: 'Tasdiqlash kodi yuborildi',
      data: {
        paymentId: payment.id,
        otpSessionId,
        maskedPhone: `${'*'.repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}`,
        expiresInSeconds: OTP_TTL_SECONDS,
      },
    };
  }

  async confirmCardOtp(dto: ConfirmCardOtpDto, user: AuthUser) {
    const raw = await this.redis.get(otpKey(dto.otpSessionId));
    if (!raw) throw new BadRequestException('Kod muddati tugagan yoki sessiya topilmadi');
    const session = JSON.parse(raw) as OtpSession;
    if (user.role === Role.STUDENT && session.studentId !== user.id) {
      throw new ForbiddenException('Bu sessiya sizniki emas');
    }
    if (session.code !== dto.code) {
      session.attempts += 1;
      if (session.attempts >= OTP_MAX_ATTEMPTS) {
        await this.redis.del(otpKey(dto.otpSessionId));
        await this.prisma.payment.update({
          where: { id: session.paymentId },
          data: { status: PaymentStatus.FAILED },
        });
        throw new BadRequestException("Urinishlar soni tugadi. To'lovni qaytadan boshlang");
      }
      await this.redis.setex(otpKey(dto.otpSessionId), OTP_TTL_SECONDS, JSON.stringify(session));
      throw new BadRequestException("Tasdiqlash kodi noto'g'ri");
    }
    await this.redis.del(otpKey(dto.otpSessionId));
    const payment = await this.prisma.payment.update({
      where: { id: session.paymentId },
      data: { status: PaymentStatus.COMPLETED, paidAt: new Date() },
    });
    return {
      success: true,
      message: "To'lov muvaffaqiyatli amalga oshirildi",
      data: { ...payment, amount: Number(payment.amount) },
    };
  }

  async handleWebhook(dto: WebhookDto) {
    const secret = this.config.get<string>('KYN_SECRET_KEY');
    if (!verifyWebhookSignature(dto, dto.signature, secret)) {
      throw new UnauthorizedException('Imzo noto\'g\'ri');
    }
    const status = (Object.values(PaymentStatus) as string[]).includes(dto.status.toUpperCase())
      ? (dto.status.toUpperCase() as PaymentStatus)
      : null;
    if (!status) throw new BadRequestException("Noma'lum status");

    const payment = await this.prisma.payment.findUnique({
      where: { invoiceNumber: dto.orderId },
    });
    if (!payment) throw new NotFoundException("To'lov topilmadi");
    if (Number(dto.amount) !== Number(payment.amount)) {
      throw new BadRequestException('Summa mos kelmadi');
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status,
          kynTransactionId: dto.transactionId,
          paidAt: status === PaymentStatus.COMPLETED ? new Date() : undefined,
        },
      }),
      this.prisma.paymentTransaction.upsert({
        where: { transactionId: dto.transactionId },
        create: {
          paymentId: payment.id,
          transactionId: dto.transactionId,
          status,
          amount: payment.amount,
          kynResponse: dto as unknown as Prisma.InputJsonValue,
          responseCode: dto.responseCode,
          responseMessage: dto.responseMessage,
        },
        update: {
          status,
          responseCode: dto.responseCode,
          responseMessage: dto.responseMessage,
        },
      }),
    ]);
    return { success: true };
  }

  async status(transactionId: string, user: AuthUser) {
    const payment = await this.prisma.payment.findFirst({
      where: { kynTransactionId: transactionId },
    });
    if (!payment) throw new NotFoundException("To'lov topilmadi");
    if (user.role === Role.STUDENT && payment.studentId !== user.id) {
      throw new ForbiddenException("Bu to'lov sizniki emas");
    }
    try {
      const { data } = await axios.get(
        `${this.config.getOrThrow<string>('KYN_API_URL')}/payments/${encodeURIComponent(transactionId)}`,
        { headers: { Authorization: `Bearer ${this.config.get<string>('KYN_API_KEY')}` }, timeout: 10_000 },
      );
      return { success: true, data: { local: payment.status, remote: data } };
    } catch {
      return { success: true, data: { local: payment.status, remote: null } };
    }
  }

  async myPayments(user: AuthUser, paging: Paging = {}) {
    const args = pageArgs(paging);
    const where = { studentId: user.id };
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { studentGroup: { include: { group: { select: { name: true } } } } },
        skip: args.skip,
        take: args.take,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      success: true,
      data: data.map(({ studentGroup, ...p }) => ({
        ...p,
        amount: Number(p.amount),
        groupName: studentGroup.group.name,
      })),
      meta: pageMeta(total, args),
    };
  }

  async adminNotifications() {
    const payments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.COMPLETED },
      orderBy: { paidAt: 'desc' },
      take: 20,
      include: {
        student: { select: { fullName: true } },
        studentGroup: { include: { group: { select: { name: true } } } },
      },
    });
    return {
      success: true,
      data: payments.map((p) => ({
        id: p.id,
        paidAt: p.paidAt,
        amount: Number(p.amount),
        studentName: p.student.fullName,
        groupName: p.studentGroup.group.name,
        paymentMethod: p.paymentMethod,
        invoiceNumber: p.invoiceNumber,
        message: `${p.student.fullName}dan ${formatUzs(p.amount)} so'm to'lov tushdi`,
      })),
    };
  }

  async stats(studentGroupId: number, user: AuthUser) {
    if (user.role === Role.STUDENT) {
      const sg = await this.prisma.studentGroup.findUnique({ where: { id: studentGroupId } });
      if (!sg || sg.studentId !== user.id) throw new ForbiddenException("Bu a'zolik sizniki emas");
    }
    // Hisob bazada: holat bo'yicha bitta guruhlangan so'rov (barcha to'lovlarni yuklamaydi)
    const rows = await this.prisma.payment.groupBy({
      by: ['status'],
      where: { studentGroupId },
      _count: { _all: true },
      _sum: { amount: true },
    });
    const of = (status: PaymentStatus) => rows.find((r) => r.status === status);
    return {
      success: true,
      data: {
        totalPayments: rows.reduce((sum, r) => sum + r._count._all, 0),
        completedAmount: Number(of(PaymentStatus.COMPLETED)?._sum.amount ?? 0),
        pendingCount: of(PaymentStatus.PENDING)?._count._all ?? 0,
      },
    };
  }
}
