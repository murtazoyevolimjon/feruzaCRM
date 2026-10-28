import { BadRequestException } from '@nestjs/common';
import { PaymentStatus, Role } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService.confirmCardOtp', () => {
  const store = new Map<string, string>();
  const redis = {
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    setex: jest.fn(async (k: string, _t: number, v: string) => void store.set(k, v)),
    del: jest.fn(async (k: string) => void store.delete(k)),
  };
  const prisma = { payment: { update: jest.fn().mockResolvedValue({ id: 7, amount: 5000 }) } };
  const service = new PaymentsService(prisma as never, {} as never, redis as never, {} as never);
  const student = { id: 3, email: 's@x.y', role: Role.STUDENT };

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
    store.set(
      'payment:otp:sess',
      JSON.stringify({ paymentId: 7, studentId: 3, code: '123456', attempts: 0 }),
    );
  });

  it("to'g'ri kod to'lovni COMPLETED qiladi va sessiyani o'chiradi", async () => {
    const res = await service.confirmCardOtp({ otpSessionId: 'sess', code: '123456' }, student);
    expect(res.success).toBe(true);
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: PaymentStatus.COMPLETED }) }),
    );
    expect(store.has('payment:otp:sess')).toBe(false);
  });

  it("noto'g'ri kod 400 beradi", async () => {
    await expect(
      service.confirmCardOtp({ otpSessionId: 'sess', code: '000000' }, student),
    ).rejects.toThrow(BadRequestException);
  });

  it('muddati tugagan sessiya 400 beradi', async () => {
    await expect(
      service.confirmCardOtp({ otpSessionId: 'yoq', code: '123456' }, student),
    ).rejects.toThrow(BadRequestException);
  });

  it("5 ta noto'g'ri urinishdan keyin sessiya va to'lov bekor qilinadi", async () => {
    for (let i = 0; i < 5; i++) {
      await service
        .confirmCardOtp({ otpSessionId: 'sess', code: '000000' }, student)
        .catch(() => undefined);
    }
    expect(store.has('payment:otp:sess')).toBe(false);
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: PaymentStatus.FAILED } }),
    );
  });
});
