import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Status, UserStatus } from '@prisma/client';
import { AuthUser } from '../../common/guard/auth-user';
import { handlePrismaError } from '../../common/prisma/prisma-error.helper';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertGroupAccess } from '../../common/utils/group-access';
import { CreateGroupDto, UpdateGroupDto } from './dto/group.dto';
import { groupSummaryInclude, toGroupSummary } from './group.mapper';
import { hasRoomConflict } from './room-conflict.util';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const groups = await this.prisma.group.findMany({
      where: { status: Status.ACTIVE },
      include: groupSummaryInclude,
      orderBy: { created_at: 'desc' },
    });
    return { success: true, data: groups.map(toGroupSummary) };
  }

  async findOne(id: number, user: AuthUser) {
    await assertGroupAccess(this.prisma, user, id);
    const group = await this.prisma.group.findUniqueOrThrow({
      where: { id },
      include: {
        course: true,
        room: true,
        teacher: { select: { id: true, fullName: true, photo: true, position: true } },
        studentGroup: {
          where: { status: Status.ACTIVE },
          include: { student: { select: { id: true, fullName: true, email: true, photo: true } } },
        },
      },
    });
    return {
      success: true,
      data: {
        id: group.id,
        name: group.name,
        status: group.status,
        startDate: group.startDate,
        lessonDays: group.weekDays,
        lessonTime: group.startTime,
        course: { ...group.course, price: Number(group.course.price) },
        room: group.room,
        teacher: group.teacher,
        students: group.studentGroup.map((sg) => ({
          studentGroupId: sg.id,
          ...sg.student,
        })),
      },
    };
  }

  async students(groupId: number, user: AuthUser) {
    await assertGroupAccess(this.prisma, user, groupId);
    const memberships = await this.prisma.studentGroup.findMany({
      where: { groupId, status: Status.ACTIVE },
      include: { student: { select: { id: true, fullName: true, email: true, photo: true } } },
    });
    return {
      success: true,
      data: memberships.map((m) => ({ studentGroupId: m.id, ...m.student })),
    };
  }

  async lessons(groupId: number, user: AuthUser) {
    await assertGroupAccess(this.prisma, user, groupId);
    const data = await this.prisma.lesson.findMany({
      where: { groupId },
      orderBy: { date: 'desc' },
    });
    return { success: true, data };
  }

  async create(dto: CreateGroupDto, actor: AuthUser) {
    await this.assertRefsActive(dto.teacherId, dto.courseId, dto.roomId);
    await this.assertNameFree(dto.name);
    const course = await this.prisma.course.findUniqueOrThrow({ where: { id: dto.courseId } });
    await this.assertRoomFree(
      dto.roomId,
      { startTime: dto.startTime, durationMinutes: course.durationLesson, weekDays: dto.weekDays },
    );
    try {
      const group = await this.prisma.group.create({
        data: { ...dto, userId: actor.id },
        include: groupSummaryInclude,
      });
      return { success: true, message: 'Guruh yaratildi', data: toGroupSummary(group) };
    } catch (error) {
      handlePrismaError(error, 'Guruh');
    }
  }

  async update(id: number, dto: UpdateGroupDto) {
    const current = await this.prisma.group.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!current) throw new NotFoundException('Guruh topilmadi');

    if (dto.teacherId && dto.teacherId !== current.teacherId) {
      await this.assertRefsActive(dto.teacherId, undefined, undefined);
    }
    if (dto.courseId && dto.courseId !== current.courseId) {
      await this.assertRefsActive(undefined, dto.courseId, undefined);
    }
    if (dto.roomId && dto.roomId !== current.roomId) {
      await this.assertRefsActive(undefined, undefined, dto.roomId);
    }
    if (dto.name && dto.name !== current.name) await this.assertNameFree(dto.name);

    const scheduleChanged =
      dto.roomId !== undefined ||
      dto.startTime !== undefined ||
      dto.weekDays !== undefined ||
      dto.courseId !== undefined;
    const nextStatus = dto.status ?? current.status;
    if (scheduleChanged && nextStatus === Status.ACTIVE) {
      const course = dto.courseId
        ? await this.prisma.course.findUniqueOrThrow({ where: { id: dto.courseId } })
        : current.course;
      await this.assertRoomFree(
        dto.roomId ?? current.roomId,
        {
          startTime: dto.startTime ?? current.startTime,
          durationMinutes: course.durationLesson,
          weekDays: dto.weekDays ?? current.weekDays,
        },
        id,
      );
    }
    try {
      const group = await this.prisma.group.update({
        where: { id },
        data: dto,
        include: groupSummaryInclude,
      });
      return { success: true, message: 'Guruh yangilandi', data: toGroupSummary(group) };
    } catch (error) {
      handlePrismaError(error, 'Guruh');
    }
  }

  /** Soft delete: status = INACTIVE. */
  async remove(id: number) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    await this.prisma.group.update({ where: { id }, data: { status: Status.INACTIVE } });
    return { success: true, message: "Guruh o'chirildi" };
  }

  // ---------- Talabani guruhga qo'shish / chiqarish ----------

  async addStudent(groupId: number, studentId: number, actor: AuthUser) {
    const [group, student] = await Promise.all([
      this.prisma.group.findUnique({ where: { id: groupId }, include: { room: true } }),
      this.prisma.student.findUnique({ where: { id: studentId } }),
    ]);
    if (!group || group.status !== Status.ACTIVE) {
      throw new NotFoundException('Faol guruh topilmadi');
    }
    if (!student || student.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('Faol talaba topilmadi');
    }

    const existing = await this.prisma.studentGroup.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    });
    if (existing?.status === Status.ACTIVE) {
      throw new ConflictException('Talaba allaqachon shu guruhda');
    }

    const count = await this.prisma.studentGroup.count({
      where: { groupId, status: Status.ACTIVE },
    });
    if (count >= group.room.capacity) {
      throw new BadRequestException(`Xona sig'imi (${group.room.capacity}) to'lgan`);
    }

    const data = existing
      ? await this.prisma.studentGroup.update({
          where: { id: existing.id },
          data: { status: Status.ACTIVE },
        })
      : await this.prisma.studentGroup.create({
          data: { groupId, studentId, userId: actor.id },
        });
    return { success: true, message: "Talaba guruhga qo'shildi", data };
  }

  async removeStudent(groupId: number, studentId: number) {
    const membership = await this.prisma.studentGroup.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    });
    if (!membership || membership.status !== Status.ACTIVE) {
      throw new NotFoundException('Talaba bu guruhda topilmadi');
    }
    await this.prisma.studentGroup.update({
      where: { id: membership.id },
      data: { status: Status.INACTIVE },
    });
    return { success: true, message: 'Talaba guruhdan chiqarildi' };
  }

  // ---------- Tekshiruvlar ----------

  private async assertRefsActive(teacherId?: number, courseId?: number, roomId?: number) {
    if (teacherId !== undefined) {
      const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId } });
      if (!teacher || teacher.status !== UserStatus.ACTIVE) {
        throw new BadRequestException("O'qituvchi topilmadi yoki faol emas");
      }
    }
    if (courseId !== undefined) {
      const course = await this.prisma.course.findUnique({ where: { id: courseId } });
      if (!course || course.status !== Status.ACTIVE) {
        throw new BadRequestException('Kurs topilmadi yoki faol emas');
      }
    }
    if (roomId !== undefined) {
      const room = await this.prisma.room.findUnique({ where: { id: roomId } });
      if (!room || room.status !== Status.ACTIVE) {
        throw new BadRequestException('Xona topilmadi yoki faol emas');
      }
    }
  }

  private async assertNameFree(name: string) {
    const exists = await this.prisma.group.findUnique({ where: { name } });
    if (exists) throw new ConflictException('Bu nomli guruh allaqachon mavjud');
  }

  private async assertRoomFree(
    roomId: number,
    candidate: { startTime: string; durationMinutes: number; weekDays: CreateGroupDto['weekDays'] },
    excludeGroupId?: number,
  ) {
    const others = await this.prisma.group.findMany({
      where: {
        roomId,
        status: Status.ACTIVE,
        ...(excludeGroupId ? { id: { not: excludeGroupId } } : {}),
      },
      include: { course: { select: { durationLesson: true } } },
    });
    const busy = hasRoomConflict(
      candidate,
      others.map((g) => ({
        startTime: g.startTime,
        durationMinutes: g.course.durationLesson,
        weekDays: g.weekDays,
      })),
    );
    if (busy) throw new BadRequestException('Bu vaqtga xona band');
  }
}
