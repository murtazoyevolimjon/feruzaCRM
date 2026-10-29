import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Loader2, TriangleAlert, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPaged } from '@/api/endpoints';
import type { PageMeta } from '@/api/types';
import { cn, errorMessage } from '@/lib/utils';

export function useFetch<T>(url: string | null, params?: Record<string, unknown>, initial?: T) {
  const [data, setData] = useState<T | undefined>(initial);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(params ?? {});

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPaged<T>(url, params);
      setData(res.data);
      setMeta(res.meta);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, meta, loading, error, reload };
}

/** Sahifalash tugmalari; bitta sahifa bo'lsa ko'rinmaydi. */
export function Pager({ meta, onPage }: { meta?: PageMeta; onPage: (page: number) => void }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[13px] text-slate-500 dark:border-slate-800">
      <span>Jami: {meta.total}</span>
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost !py-1.5" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>← Oldingi</button>
        <span className="font-semibold text-slate-700 dark:text-slate-200">{meta.page} / {meta.pages}</span>
        <button className="btn btn-ghost !py-1.5" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Keyingi →</button>
      </div>
    </div>
  );
}

export function Spinner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-brand" /> {t('loading')}
    </div>
  );
}

/** Yuklanayotganda ko'rsatiladigan yaltiroq skelet qatorlar. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="skeleton h-10 w-10 shrink-0 !rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5" style={{ width: `${70 - i * 8}%` }} />
            <div className="skeleton h-3" style={{ width: `${45 - i * 4}%` }} />
          </div>
          <div className="skeleton hidden h-7 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, icon: Icon = Inbox }: { title: string; hint?: string; icon?: ComponentType<{ className?: string }> }) {
  return (
    <div className="flex animate-fade-up flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="relative">
        <span className="absolute inset-0 animate-ping-soft rounded-full bg-indigo-400/30" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-500 dark:from-indigo-950 dark:to-violet-950">
          <Icon className="h-7 w-7" />
        </span>
      </div>
      <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {hint && <p className="max-w-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** Yuklanish / xato / bo'sh holatni bir joyda boshqaradi. */
export function AsyncState({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  if (loading) return <SkeletonRows />;
  if (error) {
    return (
      <div className="m-4 flex animate-scale-in items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
        <TriangleAlert className="h-5 w-5 shrink-0" /> {error}
      </div>
    );
  }
  if (empty) return <EmptyState title={t('empty')} />;
  return <div className="animate-fade-in">{children}</div>;
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-3xl border border-white/60 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[18px] font-bold text-slate-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-full p-2 text-slate-400 transition hover:rotate-90 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Raqamni 0 dan silliq sanab chiqadi. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('ru-RU'), duration = 900 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(origin + (value - origin) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format(shown)}</>;
}

type Tone = 'brand' | 'ok' | 'late' | 'bad';
const TONE_TEXT: Record<Tone, string> = { brand: 'text-indigo-600', ok: 'text-emerald-600', late: 'text-amber-600', bad: 'text-red-600' };
const TONE_ICON: Record<Tone, string> = {
  brand: 'from-indigo-500 to-violet-600 shadow-indigo-500/30',
  ok: 'from-emerald-400 to-teal-600 shadow-emerald-500/30',
  late: 'from-amber-400 to-orange-500 shadow-amber-500/30',
  bad: 'from-rose-400 to-red-600 shadow-red-500/30',
};

export function StatCard({
  label,
  value,
  count,
  format,
  hint,
  tone = 'brand',
  to,
  icon: Icon,
}: {
  label: string;
  value?: ReactNode;
  /** Berilsa — qiymat 0 dan sanab chiqiladi */
  count?: number;
  format?: (n: number) => string;
  hint?: ReactNode;
  tone?: Tone;
  to?: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  const body = (
    <div className="glass-panel group relative h-full overflow-hidden p-5 hover-lift">
      <div className={cn('pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-10 blur-xl transition-opacity duration-300 group-hover:opacity-25', TONE_ICON[tone])} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label">{label}</p>
          <p className={cn('mt-1.5 truncate text-[26px] font-bold leading-tight tracking-tight', TONE_TEXT[tone])}>
            {count !== undefined ? <CountUp value={count} format={format} /> : value}
          </p>
          {hint && <p className="mt-1.5 text-[12px] text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110', TONE_ICON[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

export function ProgressBar({ value, max, tone = 'brand' }: { value: number; max: number; tone?: Tone }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar = {
    brand: 'from-indigo-500 to-violet-500',
    ok: 'from-emerald-400 to-teal-500',
    late: 'from-amber-400 to-orange-500',
    bad: 'from-rose-400 to-red-500',
  }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-full origin-left animate-bar-grow rounded-full bg-gradient-to-r ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3.5 block text-sm">
      <span className="mb-1.5 block text-[12px] font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'green' | 'amber' | 'rose' | 'slate' | 'sky' }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/15',
    rose: 'bg-rose-50 text-rose-700 ring-rose-600/15',
    slate: 'bg-slate-100 text-slate-700 ring-slate-500/10',
    sky: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

export function statusTone(status: string): 'green' | 'amber' | 'rose' | 'slate' {
  if (status === 'ACTIVE' || status === 'COMPLETED' || status === 'APPROVED') return 'green';
  if (status === 'FREEZE' || status === 'PENDING') return 'amber';
  if (status === 'INACTIVE' || status === 'FAILED' || status === 'REJECTED') return 'rose';
  return 'slate';
}
