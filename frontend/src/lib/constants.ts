export const APP_NAME = 'MARKAZ CRM';
export const BRAND_NAME = 'MARKAZ CRM';

export type Role =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'ADMINSTRATOR'
  | 'MANAGEMENT'
  | 'TEACHER'
  | 'STUDENT';

export const ADMIN_PANEL_ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'ADMINSTRATOR', 'MANAGEMENT'];
/** Backend'da to'liq yozish/o'qish huquqi bor admin rollari. */
export const FULL_ADMIN_ROLES: Role[] = ['SUPERADMIN', 'ADMIN'];

export const WEEK_DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export const DAY_SHORT: Record<string, string> = {
  MONDAY: 'Du',
  TUESDAY: 'Se',
  WEDNESDAY: 'Chor',
  THURSDAY: 'Pay',
  FRIDAY: 'Jum',
  SATURDAY: 'Shan',
  SUNDAY: 'Yak',
};

export function homePathFor(role: Role | null): string {
  if (role === 'STUDENT') return '/student/dashboard';
  if (role === 'TEACHER') return '/teacher/dashboard';
  if (role) return '/admin/dashboard';
  return '/login';
}

/** Toq (Du-Chor-Jum) / Juft (Se-Pay-Shan) kunlar yorlig'i. */
export function dayPattern(days: string[]): string {
  const key = [...days].sort().join(',');
  if (key === ['FRIDAY', 'MONDAY', 'WEDNESDAY'].join(',')) return 'Toq kunlar';
  if (key === ['SATURDAY', 'THURSDAY', 'TUESDAY'].join(',')) return 'Juft kunlar';
  return '';
}
