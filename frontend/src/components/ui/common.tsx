import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { get } from '@/api/endpoints';
import { errorMessage } from '@/lib/utils';

export function useFetch<T>(url: string | null, params?: Record<string, unknown>, initial?: T) {
  const [data, setData] = useState<T | undefined>(initial);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(params ?? {});

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      setData(await get<T>(url, params));
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

  return { data, loading, error, reload };
}

export function Spinner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" /> {t('loading')}
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
  if (loading) return <Spinner />;
  if (error) return <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (empty) return <div className="p-8 text-center text-slate-500">{t('empty')}</div>;
  return <>{children}</>;
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="glass-panel max-h-[90vh] w-full max-w-lg overflow-y-auto bg-white p-6 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Yopish" className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'brand',
  to,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'brand' | 'ok' | 'late' | 'bad';
  to?: string;
}) {
  const tones = { brand: 'text-brand', ok: 'text-ok', late: 'text-late', bad: 'text-bad' };
  const body = (
    <div className="glass-panel h-full p-5 transition hover:shadow-md">
      <p className="label">{label}</p>
      <p className={`mt-1 text-[26px] font-semibold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-[12px] text-slate-500">{hint}</p>}
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

export function ProgressBar({ value, max, tone = 'brand' }: { value: number; max: number; tone?: 'brand' | 'ok' | 'late' | 'bad' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar = { brand: 'bg-brand', ok: 'bg-ok', late: 'bg-late', bad: 'bg-bad' }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block text-sm">
      <span className="mb-1 block font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'green' | 'amber' | 'rose' | 'slate' | 'sky' }) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function statusTone(status: string): 'green' | 'amber' | 'rose' | 'slate' {
  if (status === 'ACTIVE' || status === 'COMPLETED' || status === 'APPROVED') return 'green';
  if (status === 'FREEZE' || status === 'PENDING') return 'amber';
  if (status === 'INACTIVE' || status === 'FAILED' || status === 'REJECTED') return 'rose';
  return 'slate';
}
