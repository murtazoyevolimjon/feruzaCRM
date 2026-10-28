import { HomeworkStatus } from '@prisma/client';
import { buildHomeworkView, scoreToStatus } from './homework-view.util';

describe('scoreToStatus', () => {
  it('60 va undan yuqori — APPROVED', () => {
    expect(scoreToStatus(60)).toBe(HomeworkStatus.APPROVED);
    expect(scoreToStatus(100)).toBe(HomeworkStatus.APPROVED);
  });
  it('60 dan past — REJECTED', () => {
    expect(scoreToStatus(59)).toBe(HomeworkStatus.REJECTED);
    expect(scoreToStatus(0)).toBe(HomeworkStatus.REJECTED);
  });
});

describe('buildHomeworkView', () => {
  const students = [1, 2, 3, 4].map((id) => ({ id, fullName: `S${id}` }));
  const t0 = new Date('2026-01-01T10:00:00Z');
  const t1 = new Date('2026-01-01T11:00:00Z');

  it('talabalarni 4 ta statusga to\'g\'ri ajratadi', () => {
    const responses = [
      { studentId: 1, title: 'a', file: null, updated_at: t0 },
      { studentId: 2, title: 'b', file: null, updated_at: t0 },
      { studentId: 3, title: 'c', file: null, updated_at: t0 },
    ];
    const results = [
      { id: 10, studentId: 2, title: 'ok', file: null, score: 80, status: HomeworkStatus.APPROVED, updated_at: t1 },
      { id: 11, studentId: 3, title: 'no', file: null, score: 30, status: HomeworkStatus.REJECTED, updated_at: t1 },
    ];
    const view = buildHomeworkView(students, responses, results);
    expect(view.PENDING.map((x) => x.studentId)).toEqual([1]);
    expect(view.APPROVED.map((x) => x.studentId)).toEqual([2]);
    expect(view.REJECTED.map((x) => x.studentId)).toEqual([3]);
    expect(view.NOT_REVIEWED.map((x) => x.studentId)).toEqual([4]);
  });

  it('baholangandan keyin qayta topshirilsa PENDING ga qaytadi', () => {
    const responses = [{ studentId: 1, title: 'again', file: null, updated_at: t1 }];
    const results = [
      { id: 1, studentId: 1, title: 'x', file: null, score: 20, status: HomeworkStatus.REJECTED, updated_at: t0 },
    ];
    const view = buildHomeworkView([students[0]], responses, results);
    expect(view.PENDING).toHaveLength(1);
    expect(view.REJECTED).toHaveLength(0);
  });
});
