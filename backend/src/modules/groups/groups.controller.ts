import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ADMIN_ROLES, AuthUser, FULL_ADMIN_ROLES } from '../../common/guard/auth-user';
import { CurrentUser, Roles } from '../../common/guard/decorator.roles';
import { AuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Paging, PagingParams } from '../../common/utils/pagination';
import { AddStudentToGroupDto, CreateGroupDto, UpdateGroupDto } from './dto/group.dto';
import { GroupsService } from './groups.service';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: "Faol guruhlar ro'yxati" })
  findAll(@PagingParams() paging: Paging) {
    return this.groups.findAll(paging);
  }

  @Get('all')
  @Roles(...ADMIN_ROLES)
  all(@PagingParams() paging: Paging) {
    return this.groups.findAll(paging);
  }

  @Get('students/:groupId')
  @Roles(...FULL_ADMIN_ROLES, Role.TEACHER)
  students(@Param('groupId', ParseIntPipe) groupId: number, @CurrentUser() user: AuthUser) {
    return this.groups.students(groupId, user);
  }

  @Get('lesson/:groupId')
  @Roles(...FULL_ADMIN_ROLES, Role.TEACHER)
  lessons(@Param('groupId', ParseIntPipe) groupId: number, @CurrentUser() user: AuthUser) {
    return this.groups.lessons(groupId, user);
  }

  @Get(':id')
  @Roles(...FULL_ADMIN_ROLES, Role.TEACHER)
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.groups.findOne(id, user);
  }

  @Post()
  @Roles(...FULL_ADMIN_ROLES)
  @ApiOperation({ summary: 'Guruh yaratish (xona bandligi tekshiriladi)' })
  create(@Body() dto: CreateGroupDto, @CurrentUser() user: AuthUser) {
    return this.groups.create(dto, user);
  }

  @Patch(':id')
  @Roles(...FULL_ADMIN_ROLES)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGroupDto) {
    return this.groups.update(id, dto);
  }

  @Delete(':id')
  @Roles(...FULL_ADMIN_ROLES)
  @ApiOperation({ summary: 'Soft delete (status = INACTIVE)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.groups.remove(id);
  }
}

@ApiTags('Student-Group')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(...FULL_ADMIN_ROLES)
@Controller('student-group')
export class StudentGroupController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  @ApiOperation({ summary: "Talabani guruhga qo'shish" })
  add(@Body() dto: AddStudentToGroupDto, @CurrentUser() user: AuthUser) {
    return this.groups.addStudent(dto.groupId, dto.studentId, user);
  }

  @Delete(':groupId/:studentId')
  @ApiOperation({ summary: 'Talabani guruhdan chiqarish (soft)' })
  remove(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.groups.removeStudent(groupId, studentId);
  }
}
