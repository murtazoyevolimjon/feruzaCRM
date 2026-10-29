import {
  Body,
  Controller,
  Delete,
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
import { Role, UserStatus } from '@prisma/client';
import { ADMIN_ROLES, AuthUser, FULL_ADMIN_ROLES } from '../../common/guard/auth-user';
import { CurrentUser, Roles } from '../../common/guard/decorator.roles';
import { AuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { MAX_LIMIT, Paging, PagingParams } from '../../common/utils/pagination';
import { imageUpload } from '../../common/utils/upload';
import {
  CreateTeacherDto,
  ResetOwnPasswordDto,
  UpdateTeacherDto,
} from './dto/teacher.dto';
import { TeachersService } from './teachers.service';

@ApiTags('Teachers')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Post()
  @Roles(...FULL_ADMIN_ROLES)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', imageUpload))
  @ApiOperation({ summary: "O'qituvchi yaratish (rasm bilan)" })
  create(@Body() dto: CreateTeacherDto, @UploadedFile() photo?: Express.Multer.File) {
    return this.teachers.create(dto, photo);
  }

  @Get('all')
  @Roles(...ADMIN_ROLES)
  @ApiQuery({ name: 'status', enum: UserStatus, required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('status', new ParseEnumPipe(UserStatus, { optional: true })) status: UserStatus | undefined,
    @Query('q') q: string | undefined,
    @PagingParams() paging: Paging,
  ) {
    return this.teachers.findAll({ status, q }, paging, MAX_LIMIT);
  }

  @Get('me')
  @Roles(Role.TEACHER)
  me(@CurrentUser() user: AuthUser) {
    return this.teachers.findOne(user.id);
  }

  @Get('my/groups')
  @Roles(Role.TEACHER)
  myGroups(@CurrentUser() user: AuthUser) {
    return this.teachers.myGroups(user.id);
  }

  @Post('me/reset-password')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: "O'qituvchi o'z parolini o'zgartiradi" })
  resetOwnPassword(@CurrentUser() user: AuthUser, @Body() dto: ResetOwnPasswordDto) {
    return this.teachers.resetOwnPassword(user.id, dto);
  }

  @Get(':id')
  @Roles(...ADMIN_ROLES)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teachers.findOne(id);
  }

  @Put(':id')
  @Roles(...ADMIN_ROLES)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', imageUpload))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeacherDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.teachers.update(id, dto, photo);
  }

  @Delete(':id')
  @Roles(...FULL_ADMIN_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teachers.remove(id);
  }

  @Post(':id/reset-password')
  @Roles(...FULL_ADMIN_ROLES)
  @ApiOperation({ summary: 'Admin: vaqtinchalik parol generatsiya qiladi' })
  adminResetPassword(@Param('id', ParseIntPipe) id: number) {
    return this.teachers.adminResetPassword(id);
  }
}
