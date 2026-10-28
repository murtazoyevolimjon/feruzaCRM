import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Email User, Teacher va Student jadvallarining hech birida bo'lmasligi kerak (13.9). */
export async function assertEmailFree(
  prisma: PrismaService,
  email: string,
  exceptTable?: 'user' | 'teacher' | 'student',
  exceptId?: number,
): Promise<void> {
  const [user, teacher, student] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.teacher.findUnique({ where: { email }, select: { id: true } }),
    prisma.student.findUnique({ where: { email }, select: { id: true } }),
  ]);
  const taken = (table: string, row: { id: number } | null) =>
    row !== null && !(exceptTable === table && exceptId === row.id);

  if (taken('user', user) || taken('teacher', teacher) || taken('student', student)) {
    throw new ConflictException('Bu email allaqachon ishlatilgan');
  }
}
