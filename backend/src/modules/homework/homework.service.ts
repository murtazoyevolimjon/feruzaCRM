import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { HomeworkStatus, Role, Status } from '@prisma/client';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { AuthUser } from '../../common/guard/auth-user';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertGroupAccess, creatorIds } from '../../common/utils/group-access';
import { CreateHomeworkDto, UpdateHomeworkDto } from './dto/homework.dto';
import { buildHomeworkView } from './homework-view.util';

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findByGroup(groupId: number, user: AuthUser) {
    await assertGroupAccess(this.prisma, user, groupId);
    const data = await this.prisma.homework.findMany({
      where: { groupId },
      include: { lesson: { select: { title: true } } },
      orderBy: { created_at: 'desc' },
    });
    return { success: true, data };
  }

  async create(dto: CreateHomeworkDto, file: Express.Multer.File | undefined, user: AuthUser) {
    await assertGroupAccess(this.prisma, user, dto.groupId);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: dto.lessonId } });
    if (!lesson || lesson.groupId !== dto.groupId) {
      throw new BadRequestException('Dars bu guruhga tegishli emas');
    }
    const url = file ? await this.cloudinary.uploadFile(file, 'homework') : undefined;
    const data = await this.prisma.homework.create({
      data: {
        lessonId: dto.lessonId,
        groupId: dto.groupId,
        title: dto.title,
        durationTime: dto.durationTime,
        file: url,
        ...creatorIds(user),
      },
    });
    return { success: true, message: 'Uyga vazifa yaratildi', data };
  }

  async update(
    homeworkId: number,
    dto: UpdateHomeworkDto,
    file: Express.Multer.File | undefined,
    user: AuthUser,
  ) {
    const homework = await this.homeworkOrThrow(homeworkId);
    await assertGroupAccess(this.prisma, user, homework.groupId);
    // O'qituvchi faqat o'zi yaratgan vazifani tahrirlaydi
    if (user.role === Role.TEACHER && homework.teacherId !== user.id) {
      throw new ForbiddenException("Bu vazifa sizniki emas");
    }
    const data = await this.prisma.homework.update({
      where: { id: homeworkId },
      data: {
        title: dto.title,
        durationTime: dto.durationTime,
        ...(file ? { file: await this.cloudinary.uploadFile(file, 'homework') } : {}),
      },
    });
    return { success: true, message: 'Uyga vazifa yangilandi', data };
  }

  /** `status` berilsa — o'sha ro'yxat, berilmasa — to'rttasi ham. */
  async submissions(homeworkId: number, status: HomeworkStatus | undefined, user: AuthUser) {
    const homework = await this.homeworkOrThrow(homeworkId);
    await assertGroupAccess(this.prisma, user, homework.groupId);

    const [memberships, responses, results] = await Promise.all([
      this.prisma.studentGroup.findMany({
        where: { groupId: homework.groupId, status: Status.ACTIVE },
        include: { student: { select: { id: true, fullName: true } } },
      }),
      this.prisma.homeworkResponse.findMany({ where: { homeworkId } }),
      this.prisma.homeworkResult.findMany({ where: { homeworkId } }),
    ]);
    const view = buildHomeworkView(
      memberships.map((m) => m.student),
      responses,
      results,
    );
    return { success: true, data: status ? view[status] : view };
  }

  private async homeworkOrThrow(id: number) {
    const homework = await this.prisma.homework.findUnique({ where: { id } });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');
    return homework;
  }
}
