// Turlar backend javoblariga mos (phone/coin kabi mavjud bo'lmagan maydonlar yo'q).
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'FREEZE';
export type HomeworkStatus = 'APPROVED' | 'PENDING' | 'NOT_REVIEWED' | 'REJECTED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
export type PaymentMethod = 'KYN' | 'CARD' | 'TRANSFER' | 'CASH';

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface FinanceSummary {
  month: string;
  income: number;
  expense: number;
  profit: number;
  incomeByMethod: Record<string, number>;
  expenseByCategory: Record<string, number>;
  debtTotal: number;
  debtorCount: number;
}
export interface Debtor {
  studentGroupId: number;
  studentId: number;
  fullName: string;
  email: string;
  groupName: string;
  courseName: string;
  monthlyPrice: number;
  monthsDue: number;
  expected: number;
  paid: number;
  debt: number;
}
export interface Expense {
  id: number;
  title: string;
  category: string;
  amount: number;
  date: string;
  note: string | null;
  createdBy: string;
}

export interface Person {
  id: number;
  fullName: string;
  email: string;
  photo: string | null;
  status: UserStatus;
}
export interface Teacher extends Person {
  position: string | null;
  experience: number;
}
export interface Student extends Person {
  birth_date: string | null;
  created_at: string;
}
export interface Employee extends Person {
  role: string;
  position: string | null;
  address: string | null;
  hire_date: string | null;
}
export interface Course {
  id: number;
  name: string;
  durationMonth: number;
  durationLesson: number;
  price: number;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null;
  description: string | null;
  status: UserStatus;
}
export interface Room {
  id: number;
  name: string;
  capacity: number;
  status: UserStatus;
}
export interface GroupSummary {
  id: number;
  name: string;
  status: UserStatus;
  courseName: string;
  lessonDurationMinutes: number;
  lessonTime: string;
  weekDays: string[];
  startDate: string;
  roomName: string;
  roomCapacity: number;
  teacherName: string;
  createdBy: string;
  studentsCount: number;
  studentGroupId?: number;
}
export interface GroupDetails {
  id: number;
  name: string;
  status: UserStatus;
  startDate: string;
  lessonDays: string[];
  lessonTime: string;
  course: Course;
  room: Room;
  teacher: { id: number; fullName: string; photo: string | null; position: string | null };
  students: Array<{ studentGroupId: number; id: number; fullName: string; email: string; photo: string | null }>;
}
export interface Lesson {
  id: number;
  groupId: number;
  title: string;
  date: string;
}
export interface Homework {
  id: number;
  lessonId: number;
  groupId: number;
  title: string;
  file: string | null;
  durationTime: number;
  lesson?: { title: string };
  response?: { title: string; file: string | null } | null;
  result?: { score: number; status: HomeworkStatus; title: string } | null;
}
export interface LessonVideo {
  id: number;
  file: string;
  lesson?: { title: string };
}
export interface StudentLesson {
  id: number;
  title: string;
  date: string;
  time: string;
  roomName: string;
  groupName: string;
}
export interface Payment {
  id: number;
  amount: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  invoiceNumber: string;
  paymentUrl: string | null;
  paidAt: string | null;
  created_at: string;
  groupName?: string;
}
export interface PaymentNotification {
  id: number;
  paidAt: string | null;
  amount: number;
  studentName: string;
  groupName: string;
  paymentMethod: PaymentMethod;
  invoiceNumber: string;
  message: string;
}
export interface StudentStats {
  activeStudents: number;
  totalStudents: number;
  groups: number;
  frozen: number;
  archived: number;
}
export interface HomeworkEntry {
  studentId: number;
  fullName: string;
  comment?: string;
  file?: string | null;
  score?: number;
  resultId?: number;
  submittedAt?: string;
}
