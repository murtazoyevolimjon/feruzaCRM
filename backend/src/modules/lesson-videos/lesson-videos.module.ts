import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsInt } from 'class-validator';
import { AuthUser, FULL_ADMIN_ROLES } from '../../common/guard/auth-user';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { CurrentUser, Roles } from '../../common/guard/decorator.roles';
import { AuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertGroupAccess, creatorIds } from '../../common/utils/group-access';
import { videoUpload } from '../../common/utils/upload';

export class CreateLessonVideoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  lessonId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  groupId: number;

  @ApiProperty({ type: 'string', format: 'binary' })
  file?: unknown;
}

@Injectable()
export class LessonVideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findByGroup(groupId: number, user: AuthUser) {
    await assertGroupAccess(this.prisma, user, groupId);
    const data = await this.prisma.lessonVideo.findMany({
      where: { groupId },
      include: { lesson: { select: { title: true } } },
      orderBy: { created_at: 'desc' },
    });
    return { success: true, data };
  }

  async create(dto: CreateLessonVideoDto, file: Express.Multer.File | undefined, user: AuthUser) {
    if (!file) throw new BadRequestException('Video fayl yuborilmadi');
    await assertGroupAccess(this.prisma, user, dto.groupId);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: dto.lessonId } });
    if (!lesson || lesson.groupId !== dto.groupId) {
      throw new BadRequestException('Dars bu guruhga tegishli emas');
    }
    const url = await this.cloudinary.uploadFile(file, 'videos');
    const data = await this.prisma.lessonVideo.create({
      data: { lessonId: dto.lessonId, groupId: dto.groupId, file: url, ...creatorIds(user) },
    });
    return { success: true, message: 'Video yuklandi', data };
  }
}

@ApiTags('Lesson videos')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(...FULL_ADMIN_ROLES, Role.TEACHER)
@Controller('lesson-videos')
export class LessonVideosController {
  constructor(private readonly videos: LessonVideosService) {}

  @Get(':groupId')
  findByGroup(@Param('groupId', ParseIntPipe) groupId: number, @CurrentUser() user: AuthUser) {
    return this.videos.findByGroup(groupId, user);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', videoUpload))
  create(
    @Body() dto: CreateLessonVideoDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.videos.create(dto, file, user);
  }
}

@Module({
  controllers: [LessonVideosController],
  providers: [LessonVideosService],
})
export class LessonVideosModule {}
