import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Role, Status } from '@prisma/client';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';
import { AuthUser, FULL_ADMIN_ROLES } from '../../../common/guard/auth-user';
import { CurrentUser, Roles } from '../../../common/guard/decorator.roles';
import { AuthGuard } from '../../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../../common/guard/roles.guard';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { assertGroupAccess, creatorIds } from '../../../common/utils/group-access';
import { scoreToStatus } from '../homework-view.util';

export class CreateHomeworkResultDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  homeworkId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  studentId: number;

  @ApiProperty({ example: 'Yaxshi ish!', description: 'Izoh' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ example: 85, minimum: 0, maximum: 100, description: '>= 60 — APPROVED' })
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;
}

export class UpdateHomeworkResultDto {
  @ApiProperty({ example: 90, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ example: 'Qayta baholandi' })
  @IsString()
  @MinLength(1)
  title: string;
}

@Injectable()
export class HomeworkResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHomeworkResultDto, user: AuthUser) {
    const homework = await this.prisma.homework.findUnique({ where: { id: dto.homeworkId } });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');
    await assertGroupAccess(this.prisma, user, homework.groupId);

    const response = await this.prisma.homeworkResponse.findUnique({
      where: { homeworkId_studentId: { homeworkId: dto.homeworkId, studentId: dto.studentId } },
    });
    if (!response) throw new BadRequestException('Talaba bu vazifani topshirmagan');

    const existing = await this.prisma.homeworkResult.findUnique({
      where: { homeworkId_studentId: { homeworkId: dto.homeworkId, studentId: dto.studentId } },
    });
    if (existing) {
      throw new ConflictException('Allaqachon baholangan. Qayta baholash uchun PUT dan foydalaning');
    }
    const data = await this.prisma.homeworkResult.create({
      data: {
        homeworkId: dto.homeworkId,
        studentId: dto.studentId,
        title: dto.title,
        file: response.file,
        score: dto.score,
        status: scoreToStatus(dto.score),
        ...creatorIds(user),
      },
    });
    return { success: true, message: 'Baho qo\'yildi', data };
  }

  async findByHomework(homeworkId: number, user: AuthUser) {
    const homework = await this.prisma.homework.findUnique({ where: { id: homeworkId } });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');
    await assertGroupAccess(this.prisma, user, homework.groupId);
    const data = await this.prisma.homeworkResult.findMany({
      where: { homeworkId },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: { updated_at: 'desc' },
    });
    return { success: true, data };
  }

  async update(id: number, dto: UpdateHomeworkResultDto, user: AuthUser) {
    const result = await this.prisma.homeworkResult.findUnique({
      where: { id },
      include: { homework: true },
    });
    if (!result) throw new NotFoundException('Natija topilmadi');
    await assertGroupAccess(this.prisma, user, result.homework.groupId);

    const data = await this.prisma.homeworkResult.update({
      where: { id },
      data: { score: dto.score, title: dto.title, status: scoreToStatus(dto.score), ...creatorIds(user) },
    });
    return { success: true, message: 'Baho yangilandi', data };
  }
}

@ApiTags('Homework results')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(...FULL_ADMIN_ROLES, Role.TEACHER)
@Controller('homework-results')
export class HomeworkResultsController {
  constructor(private readonly results: HomeworkResultsService) {}

  @Post()
  create(@Body() dto: CreateHomeworkResultDto, @CurrentUser() user: AuthUser) {
    return this.results.create(dto, user);
  }

  @Get('homework/:homeworkId')
  findByHomework(
    @Param('homeworkId', ParseIntPipe) homeworkId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.results.findByHomework(homeworkId, user);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHomeworkResultDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.results.update(id, dto, user);
  }
}

@Module({
  controllers: [HomeworkResultsController],
  providers: [HomeworkResultsService],
})
export class HomeworkResultsModule {}
