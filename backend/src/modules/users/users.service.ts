import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { hashPassword } from '../../common/bcrypt/bcrypt';
import { AuthUser, FULL_ADMIN_ROLES } from '../../common/guard/auth-user';
import { handlePrismaError } from '../../common/prisma/prisma-error.helper';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertEmailFree } from '../../common/utils/email-unique';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const OMIT_PASSWORD = { password: true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, actor: AuthUser) {
    // SUPERADMIN ni faqat SUPERADMIN yarata oladi
    if (dto.role === Role.SUPERADMIN && actor.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('SUPERADMIN ni faqat SUPERADMIN yarata oladi');
    }
    await assertEmailFree(this.prisma, dto.email);
    try {
      const data = await this.prisma.user.create({
        data: { ...dto, password: await hashPassword(dto.password) },
        omit: OMIT_PASSWORD,
      });
      return { success: true, message: 'Xodim yaratildi', data };
    } catch (error) {
      handlePrismaError(error, 'Xodim');
    }
  }

  async findAll() {
    const data = await this.prisma.user.findMany({
      omit: OMIT_PASSWORD,
      orderBy: { created_at: 'desc' },
    });
    return { success: true, data };
  }

  async findOne(id: number) {
    const data = await this.prisma.user.findUnique({ where: { id }, omit: OMIT_PASSWORD });
    if (!data) throw new NotFoundException('Xodim topilmadi');
    return { success: true, data };
  }

  async update(id: number, dto: UpdateUserDto, actor: AuthUser) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Xodim topilmadi');

    const isFullAdmin = FULL_ADMIN_ROLES.includes(actor.role);
    const data: UpdateUserDto = { ...dto };
    if (!isFullAdmin) {
      // MANAGEMENT / ADMINSTRATOR rol, status va parolni o'zgartira olmaydi
      delete data.role;
      delete data.status;
      delete data.password;
    }
    if (data.role === Role.SUPERADMIN && actor.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('SUPERADMIN rolini faqat SUPERADMIN bera oladi');
    }
    if (data.email && data.email !== target.email) {
      await assertEmailFree(this.prisma, data.email, 'user', id);
    }
    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          ...data,
          ...(data.password ? { password: await hashPassword(data.password) } : {}),
        },
        omit: OMIT_PASSWORD,
      });
      return { success: true, message: 'Xodim yangilandi', data: updated };
    } catch (error) {
      handlePrismaError(error, 'Xodim');
    }
  }

  /** Soft delete: status INACTIVE (guruhlar bilan bog'liqlik saqlanadi). */
  async remove(id: number, actor: AuthUser) {
    if (id === actor.id) throw new BadRequestException("O'zingizni o'chira olmaysiz");
    await this.findOne(id);
    await this.prisma.user.update({ where: { id }, data: { status: UserStatus.INACTIVE } });
    return { success: true, message: "Xodim o'chirildi" };
  }
}
