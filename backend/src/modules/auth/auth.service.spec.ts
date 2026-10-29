import { UnauthorizedException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { hashPassword } from '../../common/bcrypt/bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    teacher: { findUnique: jest.fn() },
    student: { findUnique: jest.fn() },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
  const service = new AuthService(prisma as never, jwt as never);

  const account = async (role: Role) => ({
    id: 1,
    email: 'a@b.c',
    fullName: 'Test',
    photo: null,
    role,
    status: UserStatus.ACTIVE,
    password: await hashPassword('Secret123'),
  });

  it('admin to\'g\'ri parol bilan kiradi', async () => {
    prisma.user.findUnique.mockResolvedValue(await account(Role.ADMIN));
    const res = await service.loginAdmin({ email: 'a@b.c', password: 'Secret123' });
    expect(res.accessToken).toBe('signed-token');
    expect(res.user).not.toHaveProperty('password');
  });

  describe('umumiy login (rolni o\'zi aniqlaydi)', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.teacher.findUnique.mockResolvedValue(null);
      prisma.student.findUnique.mockResolvedValue(null);
    });

    it('admin emailini ADMIN sifatida kiritadi', async () => {
      prisma.user.findUnique.mockResolvedValue(await account(Role.ADMIN));
      const res = await service.login({ email: 'a@b.c', password: 'Secret123' });
      expect(res.user.role).toBe(Role.ADMIN);
    });

    it("o'qituvchi emailini TEACHER sifatida kiritadi", async () => {
      prisma.teacher.findUnique.mockResolvedValue(await account(Role.TEACHER));
      const res = await service.login({ email: 'a@b.c', password: 'Secret123' });
      expect(res.user.role).toBe(Role.TEACHER);
    });

    it('talabani STUDENT sifatida kiritadi va mustChangePassword ni qaytaradi', async () => {
      prisma.student.findUnique.mockResolvedValue({ ...(await account(Role.STUDENT)), mustChangePassword: true });
      const res = await service.login({ email: 'a@b.c', password: 'Secret123' });
      expect(res.user.role).toBe(Role.STUDENT);
      expect(res.user.mustChangePassword).toBe(true);
    });

    it("noma'lum email va noto'g'ri parolga bir xil xabar", async () => {
      await expect(service.login({ email: 'x@y.z', password: 'bad' })).rejects.toThrow(
        "Email yoki parol noto'g'ri",
      );
      prisma.teacher.findUnique.mockResolvedValue(await account(Role.TEACHER));
      await expect(service.login({ email: 'a@b.c', password: 'bad' })).rejects.toThrow(
        "Email yoki parol noto'g'ri",
      );
    });
  });

  it("noto'g'ri parolga umumiy xabar", async () => {
    prisma.user.findUnique.mockResolvedValue(await account(Role.ADMIN));
    await expect(service.loginAdmin({ email: 'a@b.c', password: 'bad' })).rejects.toThrow(
      "Admin login yoki parol noto'g'ri",
    );
  });

  it('admin loginidan MANAGEMENT rolini ham qabul qiladi, lekin boshqa jadval roli emas', async () => {
    prisma.user.findUnique.mockResolvedValue(await account(Role.TEACHER));
    await expect(service.loginAdmin({ email: 'a@b.c', password: 'Secret123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('faol bo\'lmagan foydalanuvchi kira olmaydi', async () => {
    prisma.teacher.findUnique.mockResolvedValue({
      ...(await account(Role.TEACHER)),
      status: UserStatus.INACTIVE,
    });
    await expect(service.loginTeacher({ email: 'a@b.c', password: 'Secret123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
