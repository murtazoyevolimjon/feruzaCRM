import { Prisma } from '@prisma/client';

/** Dars ro'yxatlarida faqat kerakli ustunlar qaytadi. */
export const lessonSelect = {
  id: true,
  groupId: true,
  title: true,
  date: true,
} satisfies Prisma.LessonSelect;
