import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, Status, UserStatus } from '@prisma/client';
import { hashPassword } from '../../common/bcrypt/bcrypt';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { EmailService } from '../../common/email/email.service';
import { AuthUser } from '../../common/guard/auth-user';
import { handlePrismaError } from '../../common/prisma/prisma-error.helper';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertEmailFree } from '../../common/utils/email-unique';
import { lessonSelect } from '../../common/utils/lesson-select';
import { DEFAULT_LIMIT, Paging, pageArgs, pageMeta } from '../../common/utils/pagination';
import { generateRandomPassword } from '../../common/utils/password.util';
import { groupSummaryInclude, toGroupSummary } from '../groups/group.mapper';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';

const OMIT_PASSWORD = { password: true } as const;

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly email: EmailService,
  ) {}

  async create(dto: CreateStudentDto, photo?: Express.Multer.File) {
    await assertEmailFree(this.prisma, dto.email);
    const photoUrl = photo ? await this.cloudinary.uploadFile(photo, 'students') : undefined;
    try {
      const data = await this.prisma.student.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          birth_date: dto.birth_date,
          status: dto.status,
          photo: photoUrl,
          password: await hashPassword(dto.password),
          mustChangePassword: true,
        },
        omit: OMIT_PASSWORD,
      });
      // Pochta xatosi talaba yaratilishini buzmaydi
      const emailSent = await this.email.sendEmail(dto.email, dto.email, dto.password);
      if (!emailSent) this.logger.warn(`Talaba #${data.id} uchun email yuborilmadi`);
      return { success: true, message: 'Talaba yaratildi', emailSent, data };
    } catch (error) {
      handlePrismaError(error, 'Talaba');
    }
  }

  async uploadPhoto(photo: Express.Multer.File) {
    const url = await this.cloudinary.uploadFile(photo, 'students');
    return { success: true, data: { url } };
  }

  async findAll(
    filter: { status?: UserStatus; q?: string } = {},
    paging: Paging = {},
    defaultLimit = DEFAULT_LIMIT,
  ) {
    const args = pageArgs(paging, defaultLimit);
    const q = filter.q?.trim();
    const where: Prisma.StudentWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        omit: OMIT_PASSWORD,
        orderBy: { created_at: 'desc' },
        skip: args.skip,
        take: args.take,
      }),
      this.prisma.student.count({ where }),
    ]);
    return { success: true, data, meta: pageMeta(total, args) };
  }

  async findOne(id: number, actor: AuthUser) {
    // Talaba faqat o'zinikini ko'ra oladi (13.2)
    if (actor.role === Role.STUDENT && actor.id !== id) {
      throw new ForbiddenException("Faqat o'z ma'lumotingizni ko'rishingiz mumkin");
    }
    const data = await this.prisma.student.findUnique({ where: { id }, omit: OMIT_PASSWORD });
    if (!data) throw new NotFoundException('Talaba topilmadi');
    return { success: true, data };
  }

  async update(id: number, dto: UpdateStudentDto, photo?: Express.Multer.File) {
    const current = await this.prisma.student.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Talaba topilmadi');
    if (dto.email && dto.email !== current.email) {
      await assertEmailFree(this.prisma, dto.email, 'student', id);
    }
    const { password, photo: _ignored, ...rest } = dto;
    try {
      const data = await this.prisma.student.update({
        where: { id },
        data: {
          ...rest,
          ...(password
            ? { password: await hashPassword(password), mustChangePassword: true }
            : {}),
          ...(photo ? { photo: await this.cloudinary.uploadFile(photo, 'students') } : {}),
        },
        omit: OMIT_PASSWORD,
      });
      return { success: true, message: 'Talaba yangilandi', data };
    } catch (error) {
      handlePrismaError(error, 'Talaba');
    }
  }

  /** Soft delete: talaba va uning guruhdagi a'zoliklari INACTIVE bo'ladi (13.13). */
  async remove(id: number) {
    const exists = await this.prisma.student.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Talaba topilmadi');
    await this.prisma.$transaction([
      this.prisma.student.update({ where: { id }, data: { status: UserStatus.INACTIVE } }),
      this.prisma.studentGroup.updateMany({
        where: { studentId: id, status: Status.ACTIVE },
        data: { status: Status.INACTIVE },
      }),
    ]);
    return { success: true, message: "Talaba o'chirildi" };
  }

  async resetPassword(id: number) {
    const exists = await this.prisma.student.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Talaba topilmadi');
    const temporaryPassword = generateRandomPassword(8);
    await this.prisma.student.update({
      where: { id },
      data: { password: await hashPassword(temporaryPassword), mustChangePassword: true },
    });
    return { success: true, message: 'Parol tiklandi', temporaryPassword };
  }

  async stats() {
    const [activeStudents, totalStudents, frozen, archived, groups] = await Promise.all([
      this.prisma.student.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.student.count(),
      this.prisma.student.count({ where: { status: UserStatus.FREEZE } }),
      this.prisma.student.count({ where: { status: UserStatus.INACTIVE } }),
      this.prisma.group.count({ where: { status: Status.ACTIVE } }),
    ]);
    return {
      success: true,
      data: { activeStudents, totalStudents, groups, frozen, archived },
    };
  }

  // ---------- Talabaning o'z endpointlari ----------

  async myGroups(studentId: number) {
    const memberships = await this.prisma.studentGroup.findMany({
      where: { studentId, status: Status.ACTIVE, group: { status: Status.ACTIVE } },
      include: { group: { include: groupSummaryInclude } },
    });
    return {
      success: true,
      data: memberships.map((m) => ({ ...toGroupSummary(m.group), studentGroupId: m.id })),
    };
  }

  async myDashboard(studentId: number) {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        group: {
          status: Status.ACTIVE,
          studentGroup: { some: { studentId, status: Status.ACTIVE } },
        },
      },
      include: { group: { include: { room: { select: { name: true } } } } },
      orderBy: { date: 'asc' },
      take: 200,
    });
    return {
      success: true,
      data: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        date: l.date,
        time: l.group.startTime,
        roomName: l.group.room.name,
        groupName: l.group.name,
      })),
    };
  }

  async myLessons(studentId: number, groupId: number) {
    await this.assertMember(studentId, groupId);
    const data = await this.prisma.lesson.findMany({
      where: { groupId },
      select: lessonSelect,
      orderBy: { date: 'desc' },
    });
    return { success: true, data };
  }

  async myLessonVideos(studentId: number, groupId: number) {
    await this.assertMember(studentId, groupId);
    const data = await this.prisma.lessonVideo.findMany({
      where: { groupId },
      include: { lesson: { select: { title: true } } },
      orderBy: { created_at: 'desc' },
    });
    return { success: true, data };
  }

  async myHomework(studentId: number, groupId: number, lessonId?: number) {
    await this.assertMember(studentId, groupId);
    const homework = await this.prisma.homework.findMany({
      where: { groupId, ...(lessonId ? { lessonId } : {}) },
      include: {
        lesson: { select: { title: true } },
        homeworkResponses: { where: { studentId } },
        homeworkResults: { where: { studentId } },
      },
      orderBy: { created_at: 'desc' },
    });
    return {
      success: true,
      data: homework.map(({ homeworkResponses, homeworkResults, ...hw }) => ({
        ...hw,
        response: homeworkResponses[0] ?? null,
        result: homeworkResults[0] ?? null,
      })),
    };
  }

  private async assertMember(studentId: number, groupId: number) {
    const membership = await this.prisma.studentGroup.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    });
    if (!membership || membership.status !== Status.ACTIVE) {
      throw new ForbiddenException("Siz bu guruh a'zosi emassiz");
    }
  }
}
