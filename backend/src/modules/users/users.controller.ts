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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { AuthUser, ADMIN_ROLES, FULL_ADMIN_ROLES } from '../../common/guard/auth-user';
import { CurrentUser, Roles } from '../../common/guard/decorator.roles';
import { AuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Paging, PagingParams } from '../../common/utils/pagination';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles(...FULL_ADMIN_ROLES)
  @ApiOperation({ summary: 'Xodim yaratish (ADMIN, SUPERADMIN)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.create(dto, actor);
  }

  @Get()
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: "Xodimlar ro'yxati" })
  @ApiQuery({ name: 'status', enum: UserStatus, required: false })
  @ApiQuery({ name: 'q', required: false })
  findAll(
    @Query('status', new ParseEnumPipe(UserStatus, { optional: true })) status: UserStatus | undefined,
    @Query('q') q: string | undefined,
    @PagingParams() paging: Paging,
  ) {
    return this.users.findAll({ status, q }, paging);
  }

  @Get(':id')
  @Roles(...ADMIN_ROLES)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.users.findOne(id);
  }

  @Put(':id')
  @Roles(...ADMIN_ROLES)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.users.remove(id, actor);
  }
}
