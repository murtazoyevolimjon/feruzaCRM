import { HomeworkStatus } from '@prisma/client';

export const PASS_SCORE = 60;

/** score >= 60 → APPROVED, aks holda REJECTED. */
export function scoreToStatus(score: number): HomeworkStatus {
  return score >= PASS_SCORE ? HomeworkStatus.APPROVED : HomeworkStatus.REJECTED;
}

export interface StudentRef {
  id: number;
  fullName: string;
}
export interface ResponseRow {
  studentId: number;
  title: string;
  file: string | null;
  updated_at: Date;
}
export interface ResultRow {
  id: number;
  studentId: number;
  title: string;
  file: string | null;
  score: number;
  status: HomeworkStatus;
  updated_at: Date;
}

export interface HomeworkView {
  PENDING: Array<{ studentId: number; fullName: string; comment: string; file: string | null; submittedAt: Date }>;
  NOT_REVIEWED: Array<{ studentId: number; fullName: string }>;
  REJECTED: GradedEntry[];
  APPROVED: GradedEntry[];
}
interface GradedEntry {
  resultId: number;
  studentId: number;
  fullName: string;
  score: number;
  comment: string;
  file: string | null;
  status: HomeworkStatus;
  gradedAt: Date;
}

/**
 * Topshiriqlarni 4 ta statusga ajratadi:
 *  - PENDING: topshirgan, baholanmagan (yoki baholangandan keyin qayta topshirgan)
 *  - NOT_REVIEWED: guruhning faol talabalaridan hali topshirmaganlar
 *  - REJECTED / APPROVED: baholanganlar
 */
export function buildHomeworkView(
  students: StudentRef[],
  responses: ResponseRow[],
  results: ResultRow[],
): HomeworkView {
  const nameOf = new Map(students.map((s) => [s.id, s.fullName]));
  const responseOf = new Map(responses.map((r) => [r.studentId, r]));
  const resultOf = new Map(results.map((r) => [r.studentId, r]));

  const view: HomeworkView = { PENDING: [], NOT_REVIEWED: [], REJECTED: [], APPROVED: [] };

  for (const student of students) {
    const response = responseOf.get(student.id);
    const result = resultOf.get(student.id);

    const resubmitted = !!response && !!result && response.updated_at > result.updated_at;
    if (response && (!result || resubmitted)) {
      view.PENDING.push({
        studentId: student.id,
        fullName: student.fullName,
        comment: response.title,
        file: response.file,
        submittedAt: response.updated_at,
      });
    } else if (result) {
      view[result.status === HomeworkStatus.APPROVED ? 'APPROVED' : 'REJECTED'].push({
        resultId: result.id,
        studentId: student.id,
        fullName: nameOf.get(student.id) ?? '',
        score: result.score,
        comment: result.title,
        file: result.file,
        status: result.status,
        gradedAt: result.updated_at,
      });
    } else {
      view.NOT_REVIEWED.push({ studentId: student.id, fullName: student.fullName });
    }
  }
  return view;
}
