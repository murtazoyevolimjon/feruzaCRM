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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FULL_ADMIN_ROLES } from '../../common/guard/auth-user';
import { Roles } from '../../common/guard/decorator.roles';
import { AuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { CourseService } from './course.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';

@ApiTags('Course')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(...FULL_ADMIN_ROLES)
@Controller('course')
export class CourseController {
  constructor(private readonly course: CourseService) {}

  @Get('all')
  findAll() {
    return this.course.findAll();
  }

  @Post()
  create(@Body() dto: CreateCourseDto) {
    return this.course.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourseDto) {
    return this.course.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.course.remove(id);
  }
}
