import { Navigate, createBrowserRouter } from 'react-router-dom';
import AttendancePage from '@/features/attendance/pages/attendance-page';
import FinancePage from '@/features/finance/pages/finance-page';
import SettingsPage from '@/features/management/settings-page';
import DashboardLayout from '@/components/layout/dashboard-layout';
import StudentLayout from '@/components/layout/student-layout';
import TeacherLayout from '@/components/layout/teacher-layout';
import LoginPage from '@/features/auth/pages/login-page';
import DashboardPage from '@/features/dashboard/pages/dashboard-page';
import GroupDetailsPage from '@/features/groups/pages/group-details-page';
import GroupsPage from '@/features/groups/pages/groups-page';
import HomeworkPage from '@/features/homework/HomeworkPage';
import CoursesPage from '@/features/management/courses-page';
import EmployeesPage from '@/features/management/employees-page';
import RoomsPage from '@/features/management/rooms-page';
import StudentPaymentsPage from '@/features/payments/pages/student-payments-page';
import StudentsPage from '@/features/students/pages/students-page';
import StudentGroupDetails from '@/features/student/pages/group-details';
import ProfilePage from '@/features/student/pages/profile-page';
import ScheduleDashboard from '@/features/student/pages/student-dashboard-page';
import TeacherDashboardPage from '@/features/teachers/pages/teacher-dashboard-page';
import TeachersPage from '@/features/teachers/pages/teachers-page';
import { ADMIN_PANEL_ROLES } from '@/lib/constants';
import { GuestOnlyRoute, ProtectedRoute, RoleLandingRedirect } from './route-guards';

export const router = createBrowserRouter([
  { path: '/', element: <RoleLandingRedirect /> },
  {
    element: <GuestOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/student-login', element: <Navigate to="/login" replace /> },
    ],
  },
  {
    element: <ProtectedRoute roles={ADMIN_PANEL_ROLES} />,
    children: [
      {
        path: '/admin',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'teachers', element: <TeachersPage /> },
          { path: 'students', element: <StudentsPage /> },
          { path: 'groups', element: <GroupsPage panel="admin" /> },
          { path: 'groups/:id', element: <GroupDetailsPage canManageStudents /> },
          { path: 'management/courses', element: <CoursesPage /> },
          { path: 'management/rooms', element: <RoomsPage /> },
          { path: 'management/employees', element: <EmployeesPage /> },
          { path: 'homework', element: <HomeworkPage panel="admin" /> },
          { path: 'attendance', element: <AttendancePage panel="admin" /> },
          { path: 'finance', element: <FinancePage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute roles={['TEACHER']} />,
    children: [
      {
        path: '/teacher',
        element: <TeacherLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <TeacherDashboardPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'groups', element: <GroupsPage panel="teacher" /> },
          { path: 'groups/:id', element: <GroupDetailsPage /> },
          { path: 'homework', element: <HomeworkPage panel="teacher" /> },
          { path: 'attendance', element: <AttendancePage panel="teacher" /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute roles={['STUDENT']} />,
    children: [
      {
        path: '/student',
        element: <StudentLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <ScheduleDashboard url="/students/my/dashboard" /> },
          { path: 'payments', element: <StudentPaymentsPage /> },
          { path: 'groups', element: <GroupsPage panel="student" /> },
          { path: 'groups/:id', element: <StudentGroupDetails /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'settings', element: <Navigate to="/student/profile" replace /> },
          { path: 'homework', element: <HomeworkPage panel="student" /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
