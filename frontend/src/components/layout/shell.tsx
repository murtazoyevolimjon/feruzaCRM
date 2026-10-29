import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { authStore } from '@/features/auth/store/auth.store';
import { FULL_ADMIN_ROLES } from '@/lib/constants';
import { AppHeader } from './app-header';
import { AppSidebar, type NavItem, type QuickAction } from './app-sidebar';

interface Props {
  items: NavItem[];
  profilePath: string;
  quickActions?: QuickAction[];
  searchPath?: string;
}

export function Shell({ items, profilePath, quickActions, searchPath }: Props) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const role = authStore.getResolvedRole();
  const isFull = !!role && FULL_ADMIN_ROLES.includes(role);
  // Backend ruxsatlariga mos: MANAGEMENT/ADMINSTRATOR faqat o'qish bo'limlarini ko'radi
  const visible = items.filter((i) => !i.fullOnly || isFull);

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        items={visible}
        open={open}
        onClose={() => setOpen(false)}
        profilePath={profilePath}
        quickActions={isFull ? quickActions : undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader onMenu={() => setOpen(true)} searchPath={isFull ? searchPath : undefined} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
          {/* Har sahifa almashganda silliq paydo bo'ladi */}
          <div key={pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
