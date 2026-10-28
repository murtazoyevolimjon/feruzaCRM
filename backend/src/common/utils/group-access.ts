import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser } from '../guard/auth-user';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Guruh mavjudligini tekshiradi; o'qituvchi bo'lsa — faqat o'z guruhiga ruxsat.
 */
export async function assertGroupAccess(
  prisma: PrismaService,
  user: AuthUser,
  groupId: number,
) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new NotFoundException('Guruh topilmadi');
  if (user.role === Role.TEACHER && group.teacherId !== user.id) {
    throw new ForbiddenException('Bu sening guruhing emas');
  }
  return group;
}

/** Yaratuvchi maydonlari: o'qituvchi bo'lsa teacherId, aks holda userId. */
export function creatorIds(user: AuthUser): { userId?: number; teacherId?: number } {
  return user.role === Role.TEACHER ? { teacherId: user.id } : { userId: user.id };
}
