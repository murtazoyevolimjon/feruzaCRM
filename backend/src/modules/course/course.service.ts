import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Course, Status } from '@prisma/client';
import { handlePrismaError } from '../../common/prisma/prisma-error.helper';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';

const toView = (c: Course) => ({ ...c, price: Number(c.price) });

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const courses = await this.prisma.course.findMany({ orderBy: { created_at: 'desc' } });
    return { success: true, data: courses.map(toView) };
  }

  async create(dto: CreateCourseDto) {
    try {
      const course = await this.prisma.course.create({ data: dto });
      return { success: true, message: 'Kurs yaratildi', data: toView(course) };
    } catch (error) {
      handlePrismaError(error, 'Bu nomli kurs');
    }
  }

  async update(id: number, dto: UpdateCourseDto) {
    try {
      const course = await this.prisma.course.update({ where: { id }, data: dto });
      return { success: true, message: 'Kurs yangilandi', data: toView(course) };
    } catch (error) {
      handlePrismaError(error, 'Kurs');
    }
  }

  /** Soft delete: faol guruhi bor kursni o'chirib bo'lmaydi. */
  async remove(id: number) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    const activeGroups = await this.prisma.group.count({
      where: { courseId: id, status: Status.ACTIVE },
    });
    if (activeGroups > 0) {
      throw new ConflictException(`Kursda ${activeGroups} ta faol guruh bor`);
    }
    await this.prisma.course.update({ where: { id }, data: { status: Status.INACTIVE } });
    return { success: true, message: "Kurs o'chirildi" };
  }
}
