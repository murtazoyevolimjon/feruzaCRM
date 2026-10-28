import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { send, toFormData } from '@/api/endpoints';
import type { Homework, HomeworkEntry, HomeworkStatus, Lesson } from '@/api/types';
import { AsyncState, useFetch } from '@/components/ui/common';
import { errorMessage } from '@/lib/utils';

const STATUSES: HomeworkStatus[] = ['PENDING', 'NOT_REVIEWED', 'REJECTED', 'APPROVED'];

function Grading({ homework, canGrade }: { homework: Homework; canGrade: boolean }) {
  const [status, setStatus] = useState<HomeworkStatus>('PENDING');
  const { data, loading, error, reload } = useFetch<HomeworkEntry[]>(`/homework/${homework.id}`, { status }, []);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const grade = async (entry: HomeworkEntry) => {
    setMsg(null);
    try {
      const score = Number(scores[entry.studentId]);
      if (entry.resultId) await send('put', `/homework-results/${entry.resultId}`, { score, title: entry.comment || 'Qayta baholandi' });
      else await send('post', '/homework-results', { homeworkId: homework.id, studentId: entry.studentId, title: entry.comment || 'Baholandi', score });
      await reload();
    } catch (e) {
      setMsg(errorMessage(e));
    }
  };

  const rows = Array.isArray(data) ? data : [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`pill ${status === s ? 'pill-active' : 'pill-idle'}`}>{s}</button>
        ))}
      </div>
      {msg && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{msg}</p>}
      <AsyncState loading={loading} error={error} empty={rows.length === 0}>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">Talaba</th><th>Izoh</th><th>Fayl</th><th>Ball</th>{canGrade && status !== 'NOT_REVIEWED' && <th />}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2">{r.fullName}</td>
                <td>{r.comment ?? '—'}</td>
                <td>{r.file ? <a className="text-sky-600 underline" href={r.file} target="_blank" rel="noreferrer">Fayl</a> : '—'}</td>
                <td>{r.score ?? '—'}</td>
                {canGrade && status !== 'NOT_REVIEWED' && (
                  <td className="flex gap-2 py-1">
                    <input type="number" min={0} max={100} className="input w-20" value={scores[r.studentId] ?? ''} onChange={(e) => setScores({ ...scores, [r.studentId]: e.target.value })} />
                    <button className="btn btn-primary py-1" disabled={scores[r.studentId] === undefined || scores[r.studentId] === ''} onClick={() => grade(r)}>OK</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </AsyncState>
    </div>
  );
}

export function GroupHomework({ groupId, lessons }: { groupId: number; lessons: Lesson[] }) {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useFetch<Homework[]>(`/homework/group/${groupId}`, undefined, []);
  const [selected, setSelected] = useState<Homework | null>(null);
  const [form, setForm] = useState<{ lessonId: string; title: string; file?: File }>({ lessonId: '', title: '' });
  const [msg, setMsg] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await send('post', '/homework', toFormData({ groupId, lessonId: form.lessonId, title: form.title, file: form.file }));
      setForm({ lessonId: '', title: '' });
      await reload();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };

  const list = Array.isArray(data) ? data : [];
  return (
    <div className="space-y-4">
      <form onSubmit={create} className="glass-panel grid gap-3 p-4 sm:grid-cols-4">
        <select className="input" required value={form.lessonId} onChange={(e) => setForm({ ...form, lessonId: e.target.value })}>
          <option value="">Dars</option>
          {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
        <input className="input" required placeholder="Vazifa sarlavhasi" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input type="file" className="input" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })} />
        <button className="btn btn-primary">{t('add')}</button>
        {msg && <p className="text-sm text-rose-700 sm:col-span-4">{msg}</p>}
      </form>
      <AsyncState loading={loading} error={error} empty={list.length === 0}>
        <div className="flex flex-wrap gap-2">
          {list.map((h) => (
            <button key={h.id} onClick={() => setSelected(h)} className={`pill ${selected?.id === h.id ? 'pill-active' : 'pill-idle'}`}>{h.title}</button>
          ))}
        </div>
      </AsyncState>
      {selected && <div className="glass-panel p-4"><Grading key={selected.id} homework={selected} canGrade /></div>}
    </div>
  );
}

/** /homework sahifasi: guruhlar ro'yxatiga yo'naltiradi (vazifalar guruh ichida). */
export default function HomeworkPage({ panel }: { panel: 'admin' | 'teacher' | 'student' }) {
  const { t } = useTranslation();
  return (
    <div className="glass-panel p-6">
      <h1 className="mb-2 text-2xl font-bold">{t('homework')}</h1>
      <p className="text-slate-500">
        Uyga vazifalar guruh ichida boshqariladi: <a className="text-sky-600 underline" href={`/${panel}/groups`}>{t('groups')}</a>
      </p>
    </div>
  );
}
