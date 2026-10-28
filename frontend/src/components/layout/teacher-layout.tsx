import { ClipboardCheck, LayoutDashboard, School } from 'lucide-react';
import type { NavItem } from './app-sidebar';
import { Shell } from './shell';

const items: NavItem[] = [
  { to: '/teacher/dashboard', labelKey: 'navDashboard', icon: LayoutDashboard },
  { to: '/teacher/groups', labelKey: 'navMyGroups', icon: School },
  { to: '/teacher/attendance', labelKey: 'navAttendance', icon: ClipboardCheck },
];

export default function TeacherLayout() {
  return <Shell items={items} profilePath="/teacher/profile" />;
}
