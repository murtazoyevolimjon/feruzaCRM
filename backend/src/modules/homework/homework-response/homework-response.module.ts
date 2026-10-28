import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Injectable,
  Module,
  NotFoundException,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Role, Status } from '@prisma/client';
import { IsInt, IsString, MinLength } from 'class-validator';
import { CloudinaryService } from '../../../common/cloudinary/cloudinary.service';
import { AuthUser } from '../../../common/guard/auth-user';
import { CurrentUser, Roles } from '../../../common/guard/decorator.roles';
import { AuthGuard } from '../../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../../common/guard/roles.guard';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { documentUpload } from '../../../common/utils/upload';

export class SubmitHomeworkDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  homeworkId: number;

  @ApiProperty({ example: 'Vazifani bajardim, izoh...' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  file?: unknown;
}

@Injectable()
export class HomeworkResponseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private async assertCanSubmit(homeworkId: number, studentId: number) {
    const homework = await this.prisma.homework.findUnique({ where: { id: homeworkId } });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');
    const membership = await this.prisma.studentGroup.findUnique({
      where: { groupId_studentId: { groupId: homework.groupId, studentId } },
    });
    if (!membership || membership.status !== Status.ACTIVE) {
      throw new ForbiddenException("Siz bu guruh a'zosi emassiz");
    }
  }

  async submit(dto: SubmitHomeworkDto, file: Express.Multer.File | undefined, user: AuthUser) {
    await this.assertCanSubmit(dto.homeworkId, user.id);
    const existing = await this.prisma.homeworkResponse.findUnique({
      where: { homeworkId_studentId: { homeworkId: dto.homeworkId, studentId: user.id } },
    });
    if (existing) {
      throw new ConflictException('Vazifa allaqachon topshirilgan. Qayta yuborish uchun PUT dan foydalaning');
    }
    const url = file ? await this.cloudinary.uploadFile(file, 'homework-responses') : undefined;
    const data = await this.prisma.homeworkResponse.create({
      data: { homeworkId: dto.homeworkId, studentId: user.id, title: dto.title, file: url },
    });
    return { success: true, message: 'Vazifa topshirildi', data };
  }

  async resubmit(dto: SubmitHomeworkDto, file: Express.Multer.File | undefined, user: AuthUser) {
    await this.assertCanSubmit(dto.homeworkId, user.id);
    const existing = await this.prisma.homeworkResponse.findUnique({
      where: { homeworkId_studentId: { homeworkId: dto.homeworkId, studentId: user.id } },
    });
    if (!existing) throw new BadRequestException('Avval vazifani topshiring (POST)');
    const url = file ? await this.cloudinary.uploadFile(file, 'homework-responses') : undefined;
    const data = await this.prisma.homeworkResponse.update({
      where: { id: existing.id },
      data: { title: dto.title, ...(url ? { file: url } : {}) },
    });
    return { success: true, message: 'Vazifa qayta yuborildi', data };
  }
}

@ApiTags('Homework response')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Controller('homework-response')
export class HomeworkResponseController {
  constructor(private readonly responses: HomeworkResponseService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', documentUpload))
  submit(
    @Body() dto: SubmitHomeworkDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.responses.submit(dto, file, user);
  }

  @Put()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', documentUpload))
  resubmit(
    @Body() dto: SubmitHomeworkDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.responses.resubmit(dto, file, user);
  }
}

@Module({
  controllers: [HomeworkResponseController],
  providers: [HomeworkResponseService],
})
export class HomeworkResponseModule {}
