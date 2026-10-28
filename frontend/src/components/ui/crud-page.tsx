import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { send, toFormData } from '@/api/endpoints';
import { errorMessage } from '@/lib/utils';
import { AsyncState, Badge, Field, Modal, statusTone, useFetch } from './common';

export interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'file' | 'textarea';
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  /** Tahrirlashda ko'rsatilmaydi (masalan parol) */
  createOnly?: boolean;
}

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

interface Props<T extends { id: number; status?: string }> {
  title: string;
  listUrl: string;
  /** Yaratish / yangilash yo'llari */
  createUrl: string;
  updateUrl: (id: number) => string;
  updateMethod?: 'put' | 'patch';
  deleteUrl?: (id: number) => string;
  resetPasswordUrl?: (id: number) => string;
  columns: Array<Column<T>>;
  fields: FormField[];
  multipart?: boolean;
  searchText: (row: T) => string;
  statusFilter?: boolean;
  /** Formaga yuborishdan oldin qiymatlarni tayyorlash */
  prepare?: (values: Record<string, unknown>) => Record<string, unknown>;
  initialValues?: (row: T) => Record<string, unknown>;
}

export function CrudPage<T extends { id: number; status?: string }>(p: Props<T>) {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useFetch<T[]>(p.listUrl, undefined, []);
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    return list.filter(
      (r) =>
        (!status || r.status === status) &&
        p.searchText(r).toLowerCase().includes(query.toLowerCase()),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query, status]);

  const open = (row: T | 'new') => {
    setFormError(null);
    setValues(row === 'new' ? {} : (p.initialValues?.(row) ?? (row as unknown as Record<string, unknown>)));
    setEditing(row);
  };

  // Global qidiruv (?q=) va tezkor qo'shish (?new=1) bilan kelganda
  useEffect(() => {
    setQuery(params.get('q') ?? '');
    if (params.get('new')) {
      open('new');
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = p.prepare ? p.prepare(values) : values;
      const payload = p.multipart ? toFormData(body) : body;
      if (editing === 'new') await send('post', p.createUrl, payload);
      else await send(p.updateMethod ?? 'put', p.updateUrl((editing as T).id), payload);
      setEditing(null);
      await reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: T) => {
    if (!p.deleteUrl || !window.confirm(t('confirmDelete'))) return;
    try {
      await send('delete', p.deleteUrl(row.id));
      await reload();
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };

  const reset = async (row: T) => {
    if (!p.resetPasswordUrl) return;
    try {
      const res = await send<{ temporaryPassword: string }>('post', p.resetPasswordUrl(row.id));
      setTempPassword(res.temporaryPassword);
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };

  const visibleFields = p.fields.filter((f) => editing === 'new' || !f.createOnly);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">{p.title}</h1>
        <input className="input max-w-56" placeholder={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        {p.statusFilter && (
          <select className="input max-w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('all')}</option>
            {['ACTIVE', 'FREEZE', 'INACTIVE'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <button className="btn btn-primary" onClick={() => open('new')}>
          <Plus className="h-4 w-4" /> {t('add')}
        </button>
      </div>

      <div className="glass-panel overflow-x-auto">
        <AsyncState loading={loading} error={error} empty={rows.length === 0}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <tr>
                {p.columns.map((c) => (
                  <th key={c.header} className="th">{c.header}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  {p.columns.map((c) => (
                    <td key={c.header} className="px-4 py-3">{c.render(row)}</td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button title={t('edit')} className="p-1.5 hover:text-sky-600" onClick={() => open(row)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    {p.resetPasswordUrl && (
                      <button title={t('resetPassword')} className="p-1.5 hover:text-amber-600" onClick={() => reset(row)}>
                        <KeyRound className="h-4 w-4" />
                      </button>
                    )}
                    {p.deleteUrl && (
                      <button title={t('delete')} className="p-1.5 hover:text-rose-600" onClick={() => remove(row)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AsyncState>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? t('add') : t('edit')} onClose={() => setEditing(null)}>
          <form onSubmit={submit}>
            {visibleFields.map((f) => (
              <Field key={f.name} label={f.label}>
                {f.type === 'select' ? (
                  <select
                    className="input"
                    required={f.required}
                    value={String(values[f.name] ?? '')}
                    onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  >
                    <option value="" />
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : f.type === 'file' ? (
                  <input
                    type="file"
                    accept="image/*"
                    className="input"
                    onChange={(e) => setValues({ ...values, [f.name]: e.target.files?.[0] })}
                  />
                ) : f.type === 'textarea' ? (
                  <textarea
                    className="input"
                    rows={3}
                    value={String(values[f.name] ?? '')}
                    onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  />
                ) : (
                  <input
                    className="input"
                    type={f.type ?? 'text'}
                    required={f.required && (editing === 'new' || f.type !== 'password')}
                    minLength={f.type === 'password' ? 8 : undefined}
                    value={String(values[f.name] ?? '')}
                    onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  />
                )}
              </Field>
            ))}
            {formError && <p className="mb-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>{t('cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{t('save')}</button>
            </div>
          </form>
        </Modal>
      )}

      {tempPassword && (
        <Modal title={t('tempPassword')} onClose={() => setTempPassword(null)}>
          <p className="rounded-xl bg-slate-100 p-4 text-center font-mono text-xl dark:bg-slate-800">{tempPassword}</p>
        </Modal>
      )}
    </div>
  );
}

export const StatusBadge = ({ status }: { status?: string }) =>
  status ? <Badge tone={statusTone(status)}>{status}</Badge> : null;
