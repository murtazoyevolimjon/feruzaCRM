import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { send } from '@/api/endpoints';
import type { Course, GroupSummary, Room, Teacher } from '@/api/types';
import { AsyncState, Badge, Field, Modal, ProgressBar, StatCard, useFetch } from '@/components/ui/common';
import { authStore } from '@/features/auth/store/auth.store';
import { DAY_SHORT, FULL_ADMIN_ROLES, WEEK_DAYS, dayPattern } from '@/lib/constants';
import { errorMessage, formatDate, initials } from '@/lib/utils';

type Panel = 'admin' | 'teacher' | 'student';

const LIST_URL: Record<Panel, string> = {
  admin: '/groups',
  teacher: '/teachers/my/groups',
  student: '/students/my/groups',
};

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation();
  const teachers = useFetch<Teacher[]>('/teachers/all', undefined, []);
  const courses = useFetch<Course[]>('/course/all', undefined, []);
  const rooms = useFetch<Room[]>('/rooms/all', undefined, []);
  const [v, setV] = useState({ name: '', teacherId: '', courseId: '', roomId: '', startDate: '', startTime: '', weekDays: [] as string[] });
  const [error, setError] = useState<string | null>(null);

  const active = <T extends { status: string }>(list?: T[]) => (Array.isArray(list) ? list.filter((x) => x.status === 'ACTIVE') : []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (v.weekDays.length === 0) return setError('Kamida bitta hafta kunini tanlang');
    try {
      await send('post', '/groups', {
        name: v.name,
        teacherId: Number(v.teacherId),
        courseId: Number(v.courseId),
        roomId: Number(v.roomId),
        startDate: v.startDate,
        startTime: v.startTime,
        weekDays: v.weekDays,
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const toggleDay = (d: string) =>
    setV({ ...v, weekDays: v.weekDays.includes(d) ? v.weekDays.filter((x) => x !== d) : [...v.weekDays, d] });

  return (
    <Modal title={t('add')} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Guruh nomi"><input className="input" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="Kurs">
          <select className="input" required value={v.courseId} onChange={(e) => setV({ ...v, courseId: e.target.value })}>
            <option value="" />
            {active(courses.data).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Xona">
          <select className="input" required value={v.roomId} onChange={(e) => setV({ ...v, roomId: e.target.value })}>
            <option value="" />
            {active(rooms.data).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="O'qituvchi">
          <select className="input" required value={v.teacherId} onChange={(e) => setV({ ...v, teacherId: e.target.value })}>
            <option value="" />
            {active(teachers.data).map((x) => <option key={x.id} value={x.id}>{x.fullName}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Boshlanish sanasi"><input type="date" className="input" required value={v.startDate} onChange={(e) => setV({ ...v, startDate: e.target.value })} /></Field>
          <Field label="Dars vaqti"><input type="time" className="input" required value={v.startTime} onChange={(e) => setV({ ...v, startTime: e.target.value })} /></Field>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {WEEK_DAYS.map((d) => (
            <button type="button" key={d} onClick={() => toggleDay(d)} className={`pill ${v.weekDays.includes(d) ? 'pill-active' : 'pill-idle'}`}>
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
        {error && <p className="mb-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="btn btn-primary">{t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}

const STRIPES = ['from-indigo-500 to-violet-500', 'from-sky-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500', 'from-rose-400 to-pink-500', 'from-fuchsia-500 to-purple-500'];
function stripe(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return STRIPES[h % STRIPES.length];
}

function endTime(start: string, minutes: number): string {
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function GroupsPage({ panel }: { panel: Panel }) {
  const { t } = useTranslation();
  const role = authStore.getResolvedRole();
  const canWrite = panel === 'admin' && !!role && FULL_ADMIN_ROLES.includes(role);
  // MANAGEMENT/ADMINSTRATOR guruh tafsilotini ko'ra olmaydi (backend ruxsati)
  const canOpen = panel !== 'admin' || canWrite;
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useFetch<GroupSummary[]>(LIST_URL[panel], undefined, []);
  const [creating, setCreating] = useState(canWrite && params.get('new') === '1');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('');
  const [teacher, setTeacher] = useState('');

  useEffect(() => {
    if (params.get('new') === '1') {
      if (canWrite) setCreating(true);
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const all = Array.isArray(data) ? data : [];
  const courseNames = [...new Set(all.map((g) => g.courseName))];
  const teacherNames = [...new Set(all.map((g) => g.teacherName))];
  const groups = all.filter(
    (g) =>
      (!course || g.courseName === course) &&
      (!teacher || g.teacherName === teacher) &&
      `${g.name} ${g.courseName}`.toLowerCase().includes(query.toLowerCase()),
  );
  const seats = all.reduce((s, g) => s + g.roomCapacity, 0);
  const taken = all.reduce((s, g) => s + g.studentsCount, 0);

  const attendancePath = panel === 'student' ? null : `/${panel}/attendance`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto">Guruhlar va Kurslar Boshqaruvi</h1>
        <div className="flex gap-1">
          <button className={`pill ${view === 'cards' ? 'pill-active' : 'pill-idle'}`} onClick={() => setView('cards')}>Karta</button>
          <button className={`pill ${view === 'table' ? 'pill-active' : 'pill-idle'}`} onClick={() => setView('table')}>Jadval</button>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Yangi Guruh Ochish</button>
        )}
      </div>

      {panel !== 'student' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Faol guruhlar" value={all.length} />
          <StatCard label="Bo'sh o'rinlar" value={Math.max(seats - taken, 0)} hint={`${taken} / ${seats} o'rin band`} tone="late" />
          <StatCard label="To'ldirilganlik" value={`${seats ? Math.round((taken / seats) * 100) : 0}%`} tone="ok" />
        </div>
      )}

      <div className="glass-panel flex flex-wrap items-center gap-3 p-3">
        <input className="input max-w-56" placeholder={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          <button className={`pill ${!course ? 'pill-active' : 'pill-idle'}`} onClick={() => setCourse('')}>Barchasi</button>
          {courseNames.map((c) => (
            <button key={c} className={`pill ${course === c ? 'pill-active' : 'pill-idle'}`} onClick={() => setCourse(c)}>{c}</button>
          ))}
        </div>
        {teacherNames.length > 1 && (
          <select className="input ml-auto max-w-48" value={teacher} onChange={(e) => setTeacher(e.target.value)}>
            <option value="">O'qituvchi: barchasi</option>
            {teacherNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
      </div>

      <AsyncState loading={loading} error={error} empty={groups.length === 0}>
        {view === 'cards' ? (
          <div className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map((g) => {
              const full = g.studentsCount >= g.roomCapacity;
              const pattern = dayPattern(g.weekDays);
              return (
                <div key={g.id} className="glass-panel hover-lift relative flex flex-col overflow-hidden p-5 pt-6">
                  <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${stripe(g.courseName)}`} />
                  <div className="mb-2 flex items-center justify-between">
                    <Badge tone="sky">{g.courseName}</Badge>
                    <span className="text-[12px] text-slate-400">#GRP-{g.id}</span>
                  </div>
                  <h2 className="mb-3">{g.name}</h2>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[12px] font-bold text-white shadow-md">{initials(g.teacherName)}</span>
                    <span className="font-medium">{g.teacherName}</span>
                  </div>
                  <dl className="mb-4 space-y-1 text-slate-600 dark:text-slate-300">
                    <div>ðŸ•’ {g.lessonTime} - {endTime(g.lessonTime, g.lessonDurationMinutes)}</div>
                    <div>ðŸšª {g.roomName}</div>
                    <div>ðŸ“… {pattern ? `${pattern} Â· ` : ''}{g.weekDays.map((d) => DAY_SHORT[d]).join('-')}</div>
                    <div>ðŸš€ Boshlanish: {formatDate(g.startDate)}</div>
                  </dl>
                  <div className="mb-4">
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span className="text-slate-500">To'lganlik</span>
                      <span className="font-medium">{g.studentsCount} / {g.roomCapacity}</span>
                    </div>
                    <ProgressBar value={g.studentsCount} max={g.roomCapacity} tone={full ? 'bad' : 'brand'} />
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    {attendancePath && canOpen && (
                      <Link to={`${attendancePath}?group=${g.id}`} className="btn btn-primary flex-1">Davomat olish</Link>
                    )}
                    {canOpen && (
                      <Link to={`/${panel}/groups/${g.id}`} state={{ studentGroupId: g.studentGroupId }} className="btn btn-ghost flex-1">
                        {panel === 'student' ? 'Ochish' : "O'quvchilar"}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr><th className="th">Guruh</th><th className="th">Kurs</th><th className="th">O'qituvchi</th><th className="th">Vaqt</th><th className="th">Xona</th><th className="th">O'quvchilar</th><th className="th" /></tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium">{g.name}</td>
                    <td className="px-4 py-3">{g.courseName}</td>
                    <td className="px-4 py-3">{g.teacherName}</td>
                    <td className="px-4 py-3">{g.lessonTime} Â· {g.weekDays.map((d) => DAY_SHORT[d]).join('-')}</td>
                    <td className="px-4 py-3">{g.roomName}</td>
                    <td className="px-4 py-3">{g.studentsCount} / {g.roomCapacity}</td>
                    <td className="px-4 py-3 text-right">
                      {canOpen && <Link to={`/${panel}/groups/${g.id}`} state={{ studentGroupId: g.studentGroupId }} className="text-brand hover:underline">Ochish</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncState>
      {creating && <CreateGroupModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); void reload(); }} />}
    </div>
  );
}
