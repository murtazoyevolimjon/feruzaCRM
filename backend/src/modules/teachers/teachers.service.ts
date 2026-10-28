import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Status, UserStatus } from '@prisma/client';
import { compare, hashPassword } from '../../common/bcrypt/bcrypt';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { handlePrismaError } from '../../common/prisma/prisma-error.helper';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertEmailFree } from '../../common/utils/email-unique';
import { generateRandomPassword } from '../../common/utils/password.util';
import { groupSummaryInclude, toGroupSummary } from '../groups/group.mapper';
import {
  CreateTeacherDto,
  ResetOwnPasswordDto,
  UpdateTeacherDto,
} from './dto/teacher.dto';

const OMIT_PASSWORD = { password: true } as const;

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreateTeacherDto, photo?: Express.Multer.File) {
    await assertEmailFree(this.prisma, dto.email);
    const photoUrl = photo ? await this.cloudinary.uploadFile(photo, 'teachers') : undefined;
    try {
      const data = await this.prisma.teacher.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          position: dto.position,
          experience: dto.experience,
          status: dto.status,
          photo: photoUrl,
          password: await hashPassword(dto.password),
        },
        omit: OMIT_PASSWORD,
      });
      return { success: true, message: "O'qituvchi yaratildi", data };
    } catch (error) {
      handlePrismaError(error, "O'qituvchi");
    }
  }

  async findAll() {
    const data = await this.prisma.teacher.findMany({
      omit: OMIT_PASSWORD,
      orderBy: { created_at: 'desc' },
    });
    return { success: true, data };
  }

  async findOne(id: number) {
    const data = await this.prisma.teacher.findUnique({ where: { id }, omit: OMIT_PASSWORD });
    if (!data) throw new NotFoundException("O'qituvchi topilmadi");
    return { success: true, data };
  }

  async myGroups(teacherId: number) {
    const groups = await this.prisma.group.findMany({
      where: { teacherId, status: Status.ACTIVE },
      include: groupSummaryInclude,
      orderBy: { created_at: 'desc' },
    });
    return { success: true, data: groups.map(toGroupSummary) };
  }

  async update(id: number, dto: UpdateTeacherDto, photo?: Express.Multer.File) {
    const current = await this.prisma.teacher.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("O'qituvchi topilmadi");
    if (dto.email && dto.email !== current.email) {
      await assertEmailFree(this.prisma, dto.email, 'teacher', id);
    }
    const { password, photo: _ignored, ...rest } = dto;
    try {
      const data = await this.prisma.teacher.update({
        where: { id },
        data: {
          ...rest,
          ...(password ? { password: await hashPassword(password) } : {}),
          ...(photo ? { photo: await this.cloudinary.uploadFile(photo, 'teachers') } : {}),
        },
        omit: OMIT_PASSWORD,
      });
      return { success: true, message: "O'qituvchi yangilandi", data };
    } catch (error) {
      handlePrismaError(error, "O'qituvchi");
    }
  }

  /** Soft delete. Faol guruhi bor o'qituvchini o'chirib bo'lmaydi (13.13). */
  async remove(id: number) {
    await this.findOne(id);
    const activeGroups = await this.prisma.group.count({
      where: { teacherId: id, status: Status.ACTIVE },
    });
    if (activeGroups > 0) {
      throw new ConflictException(
        `O'qituvchining ${activeGroups} ta faol guruhi bor. Avval guruhlarni boshqa o'qituvchiga o'tkazing`,
      );
    }
    await this.prisma.teacher.update({ where: { id }, data: { status: UserStatus.INACTIVE } });
    return { success: true, message: "O'qituvchi o'chirildi" };
  }

  /** Admin: vaqtinchalik parol generatsiya qiladi va qaytaradi. */
  async adminResetPassword(id: number) {
    await this.findOne(id);
    const temporaryPassword = generateRandomPassword(8);
    await this.prisma.teacher.update({
      where: { id },
      data: { password: await hashPassword(temporaryPassword) },
    });
    return { success: true, message: 'Parol tiklandi', temporaryPassword };
  }

  async resetOwnPassword(id: number, dto: ResetOwnPasswordDto) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    if (!(await compare(dto.oldPassword, teacher.password))) {
      throw new BadRequestException("Eski parol noto'g'ri");
    }
    await this.prisma.teacher.update({
      where: { id },
      data: { password: await hashPassword(dto.password) },
    });
    return { success: true, message: "Parol o'zgartirildi" };
  }
}
