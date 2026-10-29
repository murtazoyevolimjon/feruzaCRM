import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, HelpCircle, Menu, Moon, Search, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { get } from '@/api/endpoints';
import type { PaymentNotification } from '@/api/types';
import { setLanguage } from '@/i18n';
import { authStore } from '@/features/auth/store/auth.store';
import { ADMIN_PANEL_ROLES } from '@/lib/constants';
import { formatDate, formatMoney, initials } from '@/lib/utils';
import { themeStore } from '@/store/theme.store';

export function AppHeader({ onMenu, searchPath }: { onMenu: () => void; searchPath?: string }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [dark, setDark] = useState(themeStore.isDark());
  const [notes, setNotes] = useState<PaymentNotification[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [query, setQuery] = useState('');
  const notesRef = useRef<HTMLDivElement>(null);
  const user = authStore.getUser();
  const isAdmin = !!user && ADMIN_PANEL_ROLES.includes(user.role);

  useEffect(() => {
    if (!isAdmin) return;
    get<PaymentNotification[]>('/payments/admin-notifications')
      .then((d) => setNotes(Array.isArray(d) ? d : []))
      .catch(() => setNotes([]));
  }, [isAdmin]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (notesRef.current && !notesRef.current.contains(e.target as Node)) setShowNotes(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPath) navigate(`${searchPath}?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/75 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:px-6">
      <button className="lg:hidden" onClick={onMenu} aria-label="Menu">
        <Menu className="h-5 w-5" />
      </button>

      {searchPath ? (
        <form onSubmit={search} className="relative mr-auto w-full max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input rounded-full bg-slate-100/80 pl-10"
            placeholder="O'quvchi ismi, ID yoki email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
      ) : (
        <p className="mr-auto font-medium">{t('helloUser', { name: user?.fullName ?? '' })}</p>
      )}

      <select
        value={i18n.language}
        onChange={(e) => setLanguage(e.target.value as 'uz' | 'en' | 'ru')}
        className="input w-[76px] cursor-pointer rounded-full py-1.5"
        aria-label="Til"
      >
        <option value="uz">UZ</option>
        <option value="en">EN</option>
        <option value="ru">RU</option>
      </select>

      <button className="rounded-full p-2.5 text-slate-500 transition-all hover:rotate-12 hover:bg-indigo-50 hover:text-indigo-600 active:scale-90 dark:hover:bg-slate-800" onClick={() => setDark(themeStore.toggle())} aria-label="Mavzu">
        {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </button>

      <a href="mailto:support@markaz.uz" className="hidden rounded-full p-2.5 text-slate-500 transition-all hover:bg-indigo-50 hover:text-indigo-600 sm:block" aria-label="Yordam">
        <HelpCircle className="h-[18px] w-[18px]" />
      </a>

      {isAdmin && (
        <div className="relative" ref={notesRef}>
          <button className="group relative rounded-full p-2.5 text-slate-500 transition-all hover:bg-indigo-50 hover:text-indigo-600 active:scale-90 dark:hover:bg-slate-800" onClick={() => setShowNotes((v) => !v)} aria-label={t('notifications')}>
            <Bell className="h-[18px] w-[18px] group-hover:animate-wiggle" />
            {notes.length > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center">
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-red-400" />
                <span className="relative flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{notes.length}</span>
              </span>
            )}
          </button>
          {showNotes && (
            <div className="absolute right-0 z-40 mt-2 max-h-96 w-80 animate-scale-in overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <p className="px-2 py-1.5 text-[12px] font-semibold text-slate-500">{t('notifications')}</p>
              {notes.length === 0 && <p className="p-3 text-slate-500">{t('empty')}</p>}
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <p className="font-medium">{n.studentName}</p>
                  <p className="text-[12px] text-slate-500">{formatMoney(n.amount)} · {n.groupName} · {formatDate(n.paidAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-700">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[12px] font-bold text-white shadow-md ring-2 ring-white dark:ring-slate-900">
          {initials(user?.fullName ?? '?')}
        </span>
        <div className="hidden leading-tight sm:block">
          <p className="text-[13px] font-medium">{user?.fullName}</p>
          <p className="text-[11px] text-slate-500">{user?.role}</p>
        </div>
      </div>
    </header>
  );
}
