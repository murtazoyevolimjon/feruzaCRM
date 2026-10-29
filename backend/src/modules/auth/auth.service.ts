import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import { compare, hashPassword } from '../../common/bcrypt/bcrypt';
import { AuthUser } from '../../common/guard/auth-user';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ChangePasswordDto, LoginDto } from './dto/login.dto';

export const ADMIN_LOGIN_ROLES: Role[] = [
  Role.ADMIN,
  Role.SUPERADMIN,
  Role.ADMINSTRATOR,
  Role.MANAGEMENT,
];

interface Account {
  id: number;
  email: string;
  fullName: string;
  photo: string | null;
  password: string;
  status: UserStatus;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Rolni o'zi aniqlaydi: email User, Teacher va Student jadvallaridan qidiriladi. */
  async login(dto: LoginDto) {
    const [user, teacher, student] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.teacher.findUnique({ where: { email: dto.email } }),
      this.prisma.student.findUnique({ where: { email: dto.email } }),
    ]);

    const candidates: Array<{ account: Account; role: Role; mustChange: boolean }> = [];
    if (user && ADMIN_LOGIN_ROLES.includes(user.role)) {
      candidates.push({ account: user, role: user.role, mustChange: false });
    }
    if (teacher) candidates.push({ account: teacher, role: Role.TEACHER, mustChange: false });
    if (student) {
      candidates.push({ account: student, role: Role.STUDENT, mustChange: student.mustChangePassword });
    }

    // Email topilmasa ham bcrypt ishlaydi: javob vaqti emailning bor-yo'qligini oshkor qilmasin
    if (candidates.length === 0) {
      await compare(dto.password, await this.dummyHash);
    }

    for (const c of candidates) {
      try {
        return await this.finishLogin(c.account, c.role, dto, 'Foydalanuvchi', c.mustChange);
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) throw error;
      }
    }
    throw new UnauthorizedException("Email yoki parol noto'g'ri");
  }

  private readonly dummyHash = hashPassword('dummy-password-for-timing');

  async loginAdmin(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const allowed = !!user && ADMIN_LOGIN_ROLES.includes(user.role);
    return this.finishLogin(allowed ? user : null, user?.role ?? Role.ADMIN, dto, 'Admin');
  }

  async loginTeacher(dto: LoginDto) {
    const teacher = await this.prisma.teacher.findUnique({ where: { email: dto.email } });
    return this.finishLogin(teacher, Role.TEACHER, dto, 'Teacher');
  }

  async loginStudent(dto: LoginDto) {
    const student = await this.prisma.student.findUnique({ where: { email: dto.email } });
    return this.finishLogin(
      student,
      Role.STUDENT,
      dto,
      'Student',
      student?.mustChangePassword ?? false,
    );
  }

  async changePassword(user: AuthUser, dto: ChangePasswordDto) {
    const account = await this.findAccount(user);
    if (!account || !(await compare(dto.oldPassword, account.password))) {
      throw new UnauthorizedException("Eski parol noto'g'ri");
    }
    const password = await hashPassword(dto.password);

    if (user.role === Role.STUDENT) {
      await this.prisma.student.update({
        where: { id: user.id },
        data: { password, mustChangePassword: false },
      });
    } else if (user.role === Role.TEACHER) {
      await this.prisma.teacher.update({ where: { id: user.id }, data: { password } });
    } else {
      await this.prisma.user.update({ where: { id: user.id }, data: { password } });
    }
    return { success: true, message: "Parol muvaffaqiyatli o'zgartirildi" };
  }

  private findAccount(user: AuthUser): Promise<Account | null> {
    if (user.role === Role.STUDENT) {
      return this.prisma.student.findUnique({ where: { id: user.id } });
    }
    if (user.role === Role.TEACHER) {
      return this.prisma.teacher.findUnique({ where: { id: user.id } });
    }
    return this.prisma.user.findUnique({ where: { id: user.id } });
  }

  private async finishLogin(
    account: Account | null,
    role: Role,
    dto: LoginDto,
    label: string,
    mustChangePassword = false,
  ) {
    const valid =
      account !== null &&
      account.status === UserStatus.ACTIVE &&
      (await compare(dto.password, account.password));
    if (!valid || !account) {
      throw new UnauthorizedException(`${label} login yoki parol noto'g'ri`);
    }

    const payload: AuthUser = { id: account.id, email: account.email, role };
    return {
      success: true,
      message: 'Login muvaffaqiyatli bajarildi',
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: account.id,
        email: account.email,
        role,
        fullName: account.fullName,
        avatar: account.photo,
        mustChangePassword,
      },
    };
  }
}
