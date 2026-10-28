import { WeekDays } from '@prisma/client';
import { hasRoomConflict, Slot } from './room-conflict.util';

const slot = (startTime: string, weekDays: WeekDays[], durationMinutes = 90): Slot => ({
  startTime,
  weekDays,
  durationMinutes,
});

describe('hasRoomConflict', () => {
  const existing = [slot('14:00', [WeekDays.MONDAY, WeekDays.WEDNESDAY])];

  it('bir kun va kesishuvchi vaqtda band', () => {
    expect(hasRoomConflict(slot('15:00', [WeekDays.MONDAY]), existing)).toBe(true);
  });

  it('boshqa kunda band emas (13.14)', () => {
    expect(hasRoomConflict(slot('14:00', [WeekDays.TUESDAY]), existing)).toBe(false);
  });

  it('dars tugagan zahoti boshlansa band emas', () => {
    expect(hasRoomConflict(slot('15:30', [WeekDays.MONDAY]), existing)).toBe(false);
  });

  it('yangi guruh oldingisidan oldin boshlanib, unga kirib ketsa band', () => {
    expect(hasRoomConflict(slot('13:00', [WeekDays.WEDNESDAY]), existing)).toBe(true);
  });
});
