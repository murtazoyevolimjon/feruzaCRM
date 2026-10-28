import { Prisma, Status } from '@prisma/client';

export const groupSummaryInclude = {
  course: { select: { name: true, durationLesson: true } },
  room: { select: { name: true, capacity: true } },
  teacher: { select: { fullName: true } },
  user: { select: { fullName: true } },
  _count: { select: { studentGroup: { where: { status: Status.ACTIVE } } } },
} satisfies Prisma.GroupInclude;

export type GroupWithSummary = Prisma.GroupGetPayload<{
  include: typeof groupSummaryInclude;
}>;

export function toGroupSummary(g: GroupWithSummary) {
  return {
    id: g.id,
    name: g.name,
    status: g.status,
    courseName: g.course.name,
    lessonDurationMinutes: g.course.durationLesson,
    lessonTime: g.startTime,
    weekDays: g.weekDays,
    startDate: g.startDate,
    roomName: g.room.name,
    roomCapacity: g.room.capacity,
    teacherName: g.teacher.fullName,
    createdBy: g.user.fullName,
    studentsCount: g._count.studentGroup,
  };
}
