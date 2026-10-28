import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { HomeworkStatus, Role } from '@prisma/client';
import { AuthUser, FULL_ADMIN_ROLES } from '../../common/guard/auth-user';
import { CurrentUser, Roles } from '../../common/guard/decorator.roles';
import { AuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { documentUpload } from '../../common/utils/upload';
import { CreateHomeworkDto, UpdateHomeworkDto } from './dto/homework.dto';
import { HomeworkService } from './homework.service';

@ApiTags('Homework')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(...FULL_ADMIN_ROLES, Role.TEACHER)
@Controller('homework')
export class HomeworkController {
  constructor(private readonly homework: HomeworkService) {}

  @Get('group/:groupId')
  findByGroup(@Param('groupId', ParseIntPipe) groupId: number, @CurrentUser() user: AuthUser) {
    return this.homework.findByGroup(groupId, user);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', documentUpload))
  create(
    @Body() dto: CreateHomeworkDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homework.create(dto, file, user);
  }

  @Put('teacher/:homeworkId')
  @Roles(Role.TEACHER)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', documentUpload))
  updateByTeacher(
    @Param('homeworkId', ParseIntPipe) homeworkId: number,
    @Body() dto: UpdateHomeworkDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homework.update(homeworkId, dto, file, user);
  }

  @Put(':homeworkId')
  @Roles(...FULL_ADMIN_ROLES)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', documentUpload))
  update(
    @Param('homeworkId', ParseIntPipe) homeworkId: number,
    @Body() dto: UpdateHomeworkDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homework.update(homeworkId, dto, file, user);
  }

  @Get(':homeworkId')
  @ApiOperation({
    summary: 'Topshiriqlar ko\'rinishi',
    description:
      'PENDING — topshirgan, baholanmagan; NOT_REVIEWED — hali topshirmaganlar; APPROVED/REJECTED — baholanganlar.',
  })
  @ApiQuery({ name: 'status', enum: HomeworkStatus, required: false })
  submissions(
    @Param('homeworkId', ParseIntPipe) homeworkId: number,
    @Query('status', new ParseEnumPipe(HomeworkStatus, { optional: true }))
    status: HomeworkStatus | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homework.submissions(homeworkId, status, user);
  }
}
