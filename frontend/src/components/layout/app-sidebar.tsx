import { useEffect, useRef, useState, type ComponentType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Plus, UserCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authStore } from '@/features/auth/store/auth.store';
import { BRAND_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  /** Faqat SUPERADMIN/ADMIN ko'radi (backend ruxsatlariga mos) */
  fullOnly?: boolean;
}

export interface QuickAction {
  label: string;
  to: string;
}

export function AppSidebar({
  items,
  open,
  onClose,
  profilePath,
  quickActions,
}: {
  items: NavItem[];
  open: boolean;
  onClose: () => void;
  profilePath: string;
  quickActions?: QuickAction[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const logout = () => {
    authStore.clear();
    navigate('/login', { replace: true });
  };

  const link = (isActive: boolean) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition',
      isActive ? 'bg-brand text-white shadow-sm' : 'text-slate-300 hover:bg-nav-soft hover:text-white',
    );

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-nav p-4 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-5 flex items-center gap-2 px-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">M</span>
          <p className="text-[15px] font-bold tracking-wide text-white">{BRAND_NAME}</p>
        </div>

        {quickActions && quickActions.length > 0 && (
          <div className="relative mb-4" ref={menuRef}>
            <button className="btn btn-primary w-full" onClick={() => setMenu((v) => !v)}>
              <Plus className="h-4 w-4" /> {t('quickAdd').replace('+ ', '')}
            </button>
            {menu && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-700 shadow-md">
                {quickActions.map((a) => (
                  <button
                    key={a.to}
                    className="block w-full px-3 py-2 text-left text-[13px] hover:bg-slate-50"
                    onClick={() => {
                      setMenu(false);
                      onClose();
                      navigate(a.to);
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} onClick={onClose} className={({ isActive }) => link(isActive)}>
                <Icon className="h-[18px] w-[18px]" />
                {t(item.labelKey)}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 space-y-1 border-t border-slate-700/60 pt-4">
          <NavLink to={profilePath} onClick={onClose} className={({ isActive }) => link(isActive)}>
            <UserCog className="h-[18px] w-[18px]" /> {t('navProfile')}
          </NavLink>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-300 transition hover:bg-nav-soft hover:text-white">
            <LogOut className="h-[18px] w-[18px]" /> {t('logout')}
          </button>
        </div>
      </aside>
    </>
  );
}
