import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { FULL_ADMIN_ROLES, AuthUser } from '../../common/guard/auth-user';
import { CurrentUser, Roles } from '../../common/guard/decorator.roles';
import { AuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertGroupAccess, creatorIds } from '../../common/utils/group-access';
import { lessonSelect } from '../../common/utils/lesson-select';

export class CreateLessonDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  groupId: number;

  @ApiProperty({ example: '1-dars: Kirish' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional({ example: '2026-09-02T14:00:00Z', description: 'Berilmasa — hozirgi vaqt' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;
}

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByGroup(groupId: number, user: AuthUser) {
    await assertGroupAccess(this.prisma, user, groupId);
    const data = await this.prisma.lesson.findMany({
      where: { groupId },
      select: lessonSelect,
      orderBy: { date: 'desc' },
    });
    return { success: true, data };
  }

  async create(dto: CreateLessonDto, user: AuthUser) {
    await assertGroupAccess(this.prisma, user, dto.groupId);
    const data = await this.prisma.lesson.create({
      data: { groupId: dto.groupId, title: dto.title, date: dto.date, ...creatorIds(user) },
    });
    return { success: true, message: "Dars qo'shildi", data };
  }
}

@ApiTags('Lessons')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(...FULL_ADMIN_ROLES, Role.TEACHER)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get(':groupId')
  findByGroup(@Param('groupId', ParseIntPipe) groupId: number, @CurrentUser() user: AuthUser) {
    return this.lessons.findByGroup(groupId, user);
  }

  @Post()
  create(@Body() dto: CreateLessonDto, @CurrentUser() user: AuthUser) {
    return this.lessons.create(dto, user);
  }
}

@Module({
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
