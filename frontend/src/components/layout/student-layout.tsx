import { LayoutDashboard, School, Wallet } from 'lucide-react';
import type { NavItem } from './app-sidebar';
import { Shell } from './shell';

const items: NavItem[] = [
  { to: '/student/dashboard', labelKey: 'navDashboard', icon: LayoutDashboard },
  { to: '/student/groups', labelKey: 'navMyGroups', icon: School },
  { to: '/student/payments', labelKey: 'payments', icon: Wallet },
];

export default function StudentLayout() {
  return <Shell items={items} profilePath="/student/profile" />;
}
