import { WeekDays } from '@prisma/client';

export interface Slot {
  startTime: string; // "HH:mm"
  durationMinutes: number;
  weekDays: WeekDays[];
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Ikki guruh bir xonada to'qnashadimi: hafta kunlari kesishishi VA
 * [start, start + davomiylik] oraliqlari kesishishi kerak (13.14).
 */
export function slotsOverlap(a: Slot, b: Slot): boolean {
  const sharedDay = a.weekDays.some((d) => b.weekDays.includes(d));
  if (!sharedDay) return false;
  const aStart = toMinutes(a.startTime);
  const bStart = toMinutes(b.startTime);
  return aStart < bStart + b.durationMinutes && bStart < aStart + a.durationMinutes;
}

export function hasRoomConflict(candidate: Slot, existing: Slot[]): boolean {
  return existing.some((slot) => slotsOverlap(candidate, slot));
}
