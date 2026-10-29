import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { ADMIN_ROLES, AuthUser, FULL_ADMIN_ROLES } from '../../common/guard/auth-user';
import { CurrentUser, Roles } from '../../common/guard/decorator.roles';
import { AuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { MAX_LIMIT, Paging, PagingParams } from '../../common/utils/pagination';
import { imageUpload } from '../../common/utils/upload';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { StudentsService } from './students.service';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Post()
  @Roles(...FULL_ADMIN_ROLES)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', imageUpload))
  @ApiOperation({ summary: 'Talaba yaratish (login va parol emailga yuboriladi)' })
  create(@Body() dto: CreateStudentDto, @UploadedFile() photo?: Express.Multer.File) {
    return this.students.create(dto, photo);
  }

  @Post('photo')
  @Roles(...FULL_ADMIN_ROLES)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', imageUpload))
  uploadPhoto(@UploadedFile() photo?: Express.Multer.File) {
    if (!photo) throw new BadRequestException('Rasm yuborilmadi');
    return this.students.uploadPhoto(photo);
  }

  @Get()
  @Roles(...FULL_ADMIN_ROLES)
  @ApiQuery({ name: 'status', enum: UserStatus, required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('status', new ParseEnumPipe(UserStatus, { optional: true })) status: UserStatus | undefined,
    @Query('q') q: string | undefined,
    @PagingParams() paging: Paging,
  ) {
    return this.students.findAll({ status, q }, paging);
  }

  /** Tanlov ro'yxatlari uchun: bitta sahifada ko'proq (MAX_LIMIT gacha). */
  @Get('all')
  @Roles(...FULL_ADMIN_ROLES)
  @ApiQuery({ name: 'status', enum: UserStatus, required: false })
  @ApiQuery({ name: 'q', required: false })
  all(
    @Query('status', new ParseEnumPipe(UserStatus, { optional: true })) status: UserStatus | undefined,
    @Query('q') q: string | undefined,
    @PagingParams() paging: Paging,
  ) {
    return this.students.findAll({ status, q }, paging, MAX_LIMIT);
  }

  @Get('stats/summary')
  @Roles(...ADMIN_ROLES)
  stats() {
    return this.students.stats();
  }

  // ----- Talaba o'zi (`:id` dan oldin turishi shart) -----

  @Get('my/groups')
  @Roles(Role.STUDENT)
  myGroups(@CurrentUser() user: AuthUser) {
    return this.students.myGroups(user.id);
  }

  @Get('my/dashboard')
  @Roles(Role.STUDENT)
  myDashboard(@CurrentUser() user: AuthUser) {
    return this.students.myDashboard(user.id);
  }

  @Get('my/lessons/:groupId')
  @Roles(Role.STUDENT)
  myLessons(@CurrentUser() user: AuthUser, @Param('groupId', ParseIntPipe) groupId: number) {
    return this.students.myLessons(user.id, groupId);
  }

  @Get('my/group/lessonVideo/:groupId')
  @Roles(Role.STUDENT)
  myLessonVideos(@CurrentUser() user: AuthUser, @Param('groupId', ParseIntPipe) groupId: number) {
    return this.students.myLessonVideos(user.id, groupId);
  }

  @Get('my/group/homework/:groupId')
  @Roles(Role.STUDENT)
  @ApiQuery({ name: 'lessonId', required: false, type: Number })
  myHomework(
    @CurrentUser() user: AuthUser,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query('lessonId', new ParseIntPipe({ optional: true })) lessonId?: number,
  ) {
    return this.students.myHomework(user.id, groupId, lessonId);
  }

  @Get(':id')
  @Roles(...FULL_ADMIN_ROLES, Role.STUDENT)
  @ApiOperation({ summary: "Talaba ma'lumoti (talaba faqat o'zinikini ko'ra oladi)" })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.students.findOne(id, user);
  }

  @Patch(':id')
  @Put(':id')
  @Roles(...FULL_ADMIN_ROLES)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', imageUpload))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.students.update(id, dto, photo);
  }

  @Delete(':id')
  @Roles(...FULL_ADMIN_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.students.remove(id);
  }

  @Post(':id/reset-password')
  @Roles(...FULL_ADMIN_ROLES)
  resetPassword(@Param('id', ParseIntPipe) id: number) {
    return this.students.resetPassword(id);
  }
}
