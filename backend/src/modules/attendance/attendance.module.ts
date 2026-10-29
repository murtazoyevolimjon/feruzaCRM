import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Role, Status } from '@prisma/client';
import { IsBoolean, IsInt } from 'class-validator';
import { AuthUser, FULL_ADMIN_ROLES } from '../../common/guard/auth-user';
import { CurrentUser, Roles } from '../../common/guard/decorator.roles';
import { AuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertGroupAccess, creatorIds } from '../../common/utils/group-access';

export class MarkAttendanceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  lessonId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  studentId: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isPresent: boolean;
}

export class MarkAllAttendanceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  lessonId: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isPresent: boolean;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async lessonOrThrow(lessonId: number, user: AuthUser) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    await assertGroupAccess(this.prisma, user, lesson.groupId);
    return lesson;
  }

  async findByLesson(lessonId: number, user: AuthUser) {
    await this.lessonOrThrow(lessonId, user);
    const data = await this.prisma.attendance.findMany({
      where: { lessonId },
      include: { student: { select: { id: true, fullName: true } } },
    });
    return { success: true, data };
  }

  /**
   * Guruhning barcha faol talabalarini bir so'rovda belgilaydi (N+1 yo'q):
   * 1 ta a'zolar so'rovi + tranzaksiyada createMany va updateMany.
   */
  async markAll(dto: MarkAllAttendanceDto, user: AuthUser) {
    const lesson = await this.lessonOrThrow(dto.lessonId, user);
    const members = await this.prisma.studentGroup.findMany({
      where: { groupId: lesson.groupId, status: Status.ACTIVE },
      select: { studentId: true },
    });
    const studentIds = members.map((m) => m.studentId);
    const who = creatorIds(user);

    await this.prisma.$transaction([
      this.prisma.attendance.createMany({
        data: studentIds.map((studentId) => ({
          lessonId: dto.lessonId,
          studentId,
          isPresent: dto.isPresent,
          ...who,
        })),
        skipDuplicates: true,
      }),
      this.prisma.attendance.updateMany({
        where: { lessonId: dto.lessonId, studentId: { in: studentIds } },
        data: { isPresent: dto.isPresent, ...who },
      }),
    ]);
    return { success: true, message: 'Davomat saqlandi', count: studentIds.length };
  }

  /** Bir dars + bir talaba uchun davomat yagona yozuv (upsert). */
  async mark(dto: MarkAttendanceDto, user: AuthUser) {
    // Dars topilgach, guruh ruxsati va a'zolik tekshiruvi parallel (ketma-ket emas)
    const lesson = await this.prisma.lesson.findUnique({ where: { id: dto.lessonId } });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    const [, membership] = await Promise.all([
      assertGroupAccess(this.prisma, user, lesson.groupId),
      this.prisma.studentGroup.findUnique({
        where: { groupId_studentId: { groupId: lesson.groupId, studentId: dto.studentId } },
      }),
    ]);
    if (!membership || membership.status !== Status.ACTIVE) {
      throw new BadRequestException('Talaba bu guruhning faol a\'zosi emas');
    }
    const data = await this.prisma.attendance.upsert({
      where: { lessonId_studentId: { lessonId: dto.lessonId, studentId: dto.studentId } },
      create: { ...dto, ...creatorIds(user) },
      update: { isPresent: dto.isPresent, ...creatorIds(user) },
    });
    return { success: true, message: 'Davomat saqlandi', data };
  }
}

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(...FULL_ADMIN_ROLES, Role.TEACHER)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get(':lessonId')
  findByLesson(@Param('lessonId', ParseIntPipe) lessonId: number, @CurrentUser() user: AuthUser) {
    return this.attendance.findByLesson(lessonId, user);
  }

  @Post()
  mark(@Body() dto: MarkAttendanceDto, @CurrentUser() user: AuthUser) {
    return this.attendance.mark(dto, user);
  }

  @Post('mark-all')
  markAll(@Body() dto: MarkAllAttendanceDto, @CurrentUser() user: AuthUser) {
    return this.attendance.markAll(dto, user);
  }
}

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
