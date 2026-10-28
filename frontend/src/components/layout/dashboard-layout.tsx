import {
  BadgeCheck,
  BookOpen,
  ClipboardCheck,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  School,
  Users,
  Wallet,
} from 'lucide-react';
import type { NavItem, QuickAction } from './app-sidebar';
import { Shell } from './shell';

const items: NavItem[] = [
  { to: '/admin/dashboard', labelKey: 'navDashboard', icon: LayoutDashboard },
  { to: '/admin/groups', labelKey: 'navGroups', icon: School },
  { to: '/admin/students', labelKey: 'navStudents', icon: Users, fullOnly: true },
  { to: '/admin/attendance', labelKey: 'navAttendance', icon: ClipboardCheck, fullOnly: true },
  { to: '/admin/finance', labelKey: 'navFinance', icon: Wallet },
  { to: '/admin/teachers', labelKey: 'navTeachers', icon: GraduationCap },
  { to: '/admin/management/employees', labelKey: 'navStaff', icon: BadgeCheck },
  { to: '/admin/management/courses', labelKey: 'navCourses', icon: BookOpen, fullOnly: true },
  { to: '/admin/management/rooms', labelKey: 'navRooms', icon: DoorOpen, fullOnly: true },
];

const quickActions: QuickAction[] = [
  { label: 'Yangi guruh', to: '/admin/groups?new=1' },
  { label: "Yangi o'quvchi", to: '/admin/students?new=1' },
  { label: "Yangi o'qituvchi", to: '/admin/teachers?new=1' },
  { label: "To'lov qabul qilish", to: '/admin/finance?pay=1' },
];

export default function DashboardLayout() {
  return <Shell items={items} profilePath="/admin/profile" quickActions={quickActions} searchPath="/admin/students" />;
}
