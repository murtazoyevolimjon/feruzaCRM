import { useEffect, useRef, useState, type ComponentType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Plus, Sparkles, UserCog } from 'lucide-react';
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
      'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-200',
      isActive
        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-glow'
        : 'text-slate-400 hover:translate-x-1 hover:bg-white/5 hover:text-white',
    );

  return (
    <>
      {open && <div className="fixed inset-0 z-30 animate-fade-in bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden bg-nav p-4 transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Orqa fon yorug'ligi */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 animate-blob rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 animate-blob rounded-full bg-violet-600/20 blur-3xl [animation-delay:-6s]" />

        <div className="relative mb-6 flex items-center gap-3 px-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[15px] font-extrabold text-white shadow-glow">
            M
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tracking-wide text-white">{BRAND_NAME}</p>
            <p className="flex items-center gap-1 text-[11px] text-slate-400"><Sparkles className="h-3 w-3 text-amber-300" /> Boshqaruv tizimi</p>
          </div>
        </div>

        {quickActions && quickActions.length > 0 && (
          <div className="relative mb-5" ref={menuRef}>
            <button className="btn btn-primary w-full rounded-2xl py-3" onClick={() => setMenu((v) => !v)}>
              <Plus className={cn('h-4 w-4 transition-transform duration-300', menu && 'rotate-45')} /> {t('quickAdd').replace('+ ', '')}
            </button>
            {menu && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 animate-scale-in overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-2xl">
                {quickActions.map((a) => (
                  <button
                    key={a.to}
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition hover:bg-indigo-50 hover:text-indigo-700"
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

        <nav className="stagger relative flex-1 space-y-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} onClick={onClose} className={({ isActive }) => link(isActive)}>
                <Icon className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />
                {t(item.labelKey)}
              </NavLink>
            );
          })}
        </nav>

        <div className="relative mt-4 space-y-1 border-t border-white/10 pt-4">
          <NavLink to={profilePath} onClick={onClose} className={({ isActive }) => link(isActive)}>
            <UserCog className="h-[18px] w-[18px]" /> {t('navProfile')}
          </NavLink>
          <button
            onClick={logout}
            className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-400 transition-all duration-200 hover:translate-x-1 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-0.5" /> {t('logout')}
          </button>
        </div>
      </aside>
    </>
  );
}
