import LoginPage from '@/features/auth/pages/login-page';

/** Talabalar uchun alohida kirish sahifasi (/student-login). */
export default function StudentLogin() {
  return <LoginPage initialKind="student" />;
}
