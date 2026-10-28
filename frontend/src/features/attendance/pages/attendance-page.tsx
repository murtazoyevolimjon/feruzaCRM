import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { send } from '@/api/endpoints';
import type { GroupSummary, Lesson } from '@/api/types';
import { AsyncState, Badge, StatCard, useFetch } from '@/components/ui/common';
import { errorMessage, formatDate, initials } from '@/lib/utils';

interface Member { id: number; fullName: string; email: string }
interface Mark { studentId: number; isPresent: boolean }

export default function AttendancePage({ panel }: { panel: 'admin' | 'teacher' }) {
  const [params, setParams] = useSearchParams();
  const groupId = params.get('group') ?? '';
  const [lessonId, setLessonId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));

  const groups = useFetch<GroupSummary[]>(panel === 'admin' ? '/groups' : '/teachers/my/groups', undefined, []);
  const lessons = useFetch<Lesson[]>(groupId ? `/lessons/${groupId}` : null, undefined, []);
  const students = useFetch<Member[]>(groupId ? `/groups/students/${groupId}` : null, undefined, []);
  const marks = useFetch<Mark[]>(lessonId ? `/attendance/${lessonId}` : null, undefined, []);

  const groupList = Array.isArray(groups.data) ? groups.data : [];
  const lessonList = Array.isArray(lessons.data) ? lessons.data : [];
  const members = Array.isArray(students.data) ? students.data : [];
  const markMap = new Map((Array.isArray(marks.data) ? marks.data : []).map((m) => [m.studentId, m.isPresent]));

  // Guruh o'zgarganda eng so'nggi darsni tanlaymiz
  useEffect(() => {
    setLessonId(lessonList.length ? String(lessonList[0].id) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons.data]);

  const present = [...markMap.values()].filter(Boolean).length;
  const absent = [...markMap.values()].filter((v) => !v).length;
  const unmarked = members.length - markMap.size;

  const mark = async (studentId: number, isPresent: boolean) => {
    setMsg(null);
    try {
      await send('post', '/attendance', { lessonId: Number(lessonId), studentId, isPresent });
      await marks.reload();
    } catch (e) {
      setMsg(errorMessage(e));
    }
  };

  const markAll = async () => {
    setBusy(true);
    setMsg(null);
    try {
      for (const m of members) {
        await send('post', '/attendance', { lessonId: Number(lessonId), studentId: m.id, isPresent: true });
      }
      await marks.reload();
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const addLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await send('post', '/lessons', { groupId: Number(groupId), title: newTitle, date: newDate });
      setNewTitle('');
      await lessons.reload();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <h1>Davomat</h1>

      <div className="glass-panel grid gap-3 p-4 md:grid-cols-2">
        <label>
          <span className="label mb-1 block">Guruh</span>
          <select className="input" value={groupId} onChange={(e) => setParams(e.target.value ? { group: e.target.value } : {})}>
            <option value="">Guruhni tanlang</option>
            {groupList.map((g) => <option key={g.id} value={g.id}>{g.name} — {g.courseName}</option>)}
          </select>
        </label>
        <label>
          <span className="label mb-1 block">Dars</span>
          <select className="input" value={lessonId} onChange={(e) => setLessonId(e.target.value)} disabled={!groupId}>
            <option value="">{lessonList.length ? 'Darsni tanlang' : 'Darslar yo‘q'}</option>
            {lessonList.map((l) => <option key={l.id} value={l.id}>{l.title} — {formatDate(l.date)}</option>)}
          </select>
        </label>
        {groupId && (
          <form onSubmit={addLesson} className="flex flex-wrap items-end gap-2 md:col-span-2">
            <label className="min-w-48 flex-1">
              <span className="label mb-1 block">Yangi dars mavzusi</span>
              <input className="input" required placeholder="React Hooks: useEffect" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </label>
            <label>
              <span className="label mb-1 block">Sana</span>
              <input type="date" className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </label>
            <button className="btn btn-ghost">Dars qo'shish</button>
          </form>
        )}
      </div>

      {msg && <p className="rounded-lg bg-red-50 p-3 text-bad">{msg}</p>}

      {!groupId && <div className="glass-panel p-8 text-center text-slate-500">Davomat olish uchun guruhni tanlang</div>}

      {groupId && (
        <AsyncState loading={students.loading || lessons.loading} error={students.error ?? lessons.error} empty={members.length === 0}>
          {lessonId ? (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Kelgan" value={present} tone="ok" />
                <StatCard label="Kelmagan" value={absent} tone="bad" />
                <StatCard label="Belgilanmagan" value={unmarked} tone="late" />
                <StatCard label="Jami" value={members.length} />
              </div>

              <div className="glass-panel overflow-x-auto">
                <div className="flex items-center justify-between p-4">
                  <h2>O'quvchilar</h2>
                  <button className="btn btn-ghost" onClick={markAll} disabled={busy}>
                    <CheckCheck className="h-4 w-4" /> Barchasini Keldi qilish
                  </button>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr><th className="th w-12">№</th><th className="th">O'quvchi</th><th className="th">Holat</th><th className="th text-right">Davomat</th></tr>
                  </thead>
                  <tbody>
                    {members.map((m, i) => {
                      const state = markMap.get(m.id);
                      return (
                        <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand">{initials(m.fullName)}</span>
                              <div><p className="font-medium">{m.fullName}</p><p className="text-[12px] text-slate-500">ID: {m.id} · {m.email}</p></div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {state === undefined ? <Badge>Belgilanmagan</Badge> : state ? <Badge tone="green">Keldi</Badge> : <Badge tone="rose">Kelmadi</Badge>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => mark(m.id, true)} className={`pill ${state === true ? 'bg-ok text-white' : 'pill-idle'}`}>Keldi</button>
                              <button onClick={() => mark(m.id, false)} className={`pill ${state === false ? 'bg-bad text-white' : 'pill-idle'}`}>Kelmadi</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="glass-panel p-8 text-center text-slate-500">Bu guruhda dars yo'q. Yuqoridan yangi dars qo'shing.</div>
          )}
        </AsyncState>
      )}
    </div>
  );
}
