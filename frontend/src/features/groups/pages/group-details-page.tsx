import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { send, toFormData } from '@/api/endpoints';
import type { GroupDetails, Lesson, LessonVideo, Student } from '@/api/types';
import { AsyncState, useFetch } from '@/components/ui/common';
import { GroupHomework } from '@/features/homework/HomeworkPage';
import { errorMessage, formatDate } from '@/lib/utils';

type Tab = 'info' | 'lessons' | 'attendance';
type SubTab = 'lessons' | 'homework' | 'videos' | 'exams' | 'journal';

function Lessons({ groupId, lessons, reload }: { groupId: number; lessons: Lesson[]; reload: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await send('post', '/lessons', { groupId, title });
      setTitle('');
      reload();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };
  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex gap-2">
        <input className="input" required placeholder="Dars mavzusi" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn btn-primary">{t('add')}</button>
      </form>
      {msg && <p className="text-sm text-rose-700">{msg}</p>}
      {lessons.map((l) => (
        <div key={l.id} className="glass-panel flex justify-between p-3 text-sm"><span>{l.title}</span><span className="text-slate-500">{formatDate(l.date)}</span></div>
      ))}
    </div>
  );
}

function Videos({ groupId, lessons }: { groupId: number; lessons: Lesson[] }) {
  const { data, loading, error, reload } = useFetch<LessonVideo[]>(`/lesson-videos/${groupId}`, undefined, []);
  const [lessonId, setLessonId] = useState('');
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await send('post', '/lesson-videos', toFormData({ lessonId, groupId, file }));
      await reload();
    } catch (err) {
      setMsg(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const list = Array.isArray(data) ? data : [];
  return (
    <div className="space-y-3">
      <form onSubmit={upload} className="glass-panel grid gap-3 p-4 sm:grid-cols-3">
        <select className="input" required value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
          <option value="">Dars</option>
          {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
        <input type="file" accept="video/*" required className="input" onChange={(e) => setFile(e.target.files?.[0])} />
        <button className="btn btn-primary" disabled={busy}>{busy ? '...' : 'Yuklash'}</button>
        {msg && <p className="text-sm text-rose-700 sm:col-span-3">{msg}</p>}
      </form>
      <AsyncState loading={loading} error={error} empty={list.length === 0}>
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((v) => (
            <div key={v.id} className="glass-panel p-3">
              <p className="mb-2 text-sm font-medium">{v.lesson?.title}</p>
              <video src={v.file} controls className="w-full rounded-xl" />
            </div>
          ))}
        </div>
      </AsyncState>
    </div>
  );
}

function Attendance({ groupId, lessons, students }: { groupId: number; lessons: Lesson[]; students: GroupDetails['students'] }) {
  const [lessonId, setLessonId] = useState('');
  const { data, reload } = useFetch<Array<{ studentId: number; isPresent: boolean }>>(lessonId ? `/attendance/${lessonId}` : null, undefined, []);
  const [msg, setMsg] = useState<string | null>(null);
  const marks = new Map((Array.isArray(data) ? data : []).map((a) => [a.studentId, a.isPresent]));

  const mark = async (studentId: number, isPresent: boolean) => {
    setMsg(null);
    try {
      await send('post', '/attendance', { lessonId: Number(lessonId), studentId, isPresent });
      await reload();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };
  return (
    <div className="space-y-3" data-group={groupId}>
      <select className="input max-w-sm" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
        <option value="">Darsni tanlang</option>
        {lessons.map((l) => <option key={l.id} value={l.id}>{l.title} — {formatDate(l.date)}</option>)}
      </select>
      {msg && <p className="text-sm text-rose-700">{msg}</p>}
      {lessonId && students.map((s) => (
        <div key={s.id} className="glass-panel flex items-center justify-between p-3 text-sm">
          <span>{s.fullName}</span>
          <span className="flex gap-2">
            <button onClick={() => mark(s.id, true)} className={`pill ${marks.get(s.id) === true ? 'pill-active' : 'pill-idle'}`}>Keldi</button>
            <button onClick={() => mark(s.id, false)} className={`pill ${marks.get(s.id) === false ? 'bg-rose-600 text-white' : 'pill-idle'}`}>Kelmadi</button>
          </span>
        </div>
      ))}
    </div>
  );
}

function AddStudent({ groupId, existing, onDone }: { groupId: number; existing: number[]; onDone: () => void }) {
  const { t } = useTranslation();
  const { data } = useFetch<Student[]>('/students/all', undefined, []);
  const [studentId, setStudentId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const options = (Array.isArray(data) ? data : []).filter((s) => s.status === 'ACTIVE' && !existing.includes(s.id));
  const add = async () => {
    try {
      await send('post', '/student-group', { groupId, studentId: Number(studentId) });
      setStudentId('');
      onDone();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Talaba qo'shish...</option>
          {options.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
        </select>
        <button className="btn btn-primary" disabled={!studentId} onClick={add}>{t('add')}</button>
      </div>
      {msg && <p className="text-sm text-rose-700">{msg}</p>}
    </div>
  );
}

export default function GroupDetailsPage({ canManageStudents = false }: { canManageStudents?: boolean }) {
  const { t } = useTranslation();
  const groupId = Number(useParams().id);
  const group = useFetch<GroupDetails>(`/groups/${groupId}`);
  const lessons = useFetch<Lesson[]>(`/lessons/${groupId}`, undefined, []);
  const [tab, setTab] = useState<Tab>('info');
  const [sub, setSub] = useState<SubTab>('lessons');
  const lessonList = Array.isArray(lessons.data) ? lessons.data : [];
  const g = group.data;

  const removeStudent = async (studentId: number) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      await send('delete', `/student-group/${groupId}/${studentId}`);
      await group.reload();
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };

  const tabs: Array<[Tab, string]> = [['info', t('info')], ['lessons', t('lessons')], ['attendance', t('attendance')]];
  const subs: Array<[SubTab, string]> = [['lessons', t('lessons')], ['homework', t('homework')], ['videos', t('videos')], ['exams', t('exams')], ['journal', t('journal')]];

  return (
    <AsyncState loading={group.loading} error={group.error} empty={!g}>
      {g && (
        <div className="space-y-4">
          <h1 className="brand-gradient-text text-2xl font-bold">{g.name}</h1>
          <div className="flex flex-wrap gap-2">
            {tabs.map(([k, label]) => <button key={k} onClick={() => setTab(k)} className={`pill ${tab === k ? 'pill-active' : 'pill-idle'}`}>{label}</button>)}
          </div>

          {tab === 'info' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass-panel space-y-1 p-5 text-sm">
                <p><b>Kurs:</b> {g.course.name} ({g.course.price.toLocaleString('ru-RU')} so'm)</p>
                <p><b>Xona:</b> {g.room.name}</p>
                <p><b>O'qituvchi:</b> {g.teacher.fullName}</p>
                <p><b>Dars vaqti:</b> {g.lessonTime} · {g.lessonDays.join(', ')}</p>
                <p><b>Boshlanish:</b> {formatDate(g.startDate)}</p>
              </div>
              <div className="glass-panel space-y-2 p-5">
                <h3 className="font-semibold">{t('students')} ({g.students.length})</h3>
                {canManageStudents && <AddStudent groupId={groupId} existing={g.students.map((s) => s.id)} onDone={() => void group.reload()} />}
                {g.students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span>{s.fullName}</span>
                    {canManageStudents && <button className="text-rose-600 hover:underline" onClick={() => removeStudent(s.id)}>{t('delete')}</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'lessons' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {subs.map(([k, label]) => <button key={k} onClick={() => setSub(k)} className={`pill text-xs ${sub === k ? 'pill-active' : 'pill-idle'}`}>{label}</button>)}
              </div>
              {sub === 'lessons' && <Lessons groupId={groupId} lessons={lessonList} reload={() => void lessons.reload()} />}
              {sub === 'homework' && <GroupHomework groupId={groupId} lessons={lessonList} />}
              {sub === 'videos' && <Videos groupId={groupId} lessons={lessonList} />}
              {(sub === 'exams' || sub === 'journal') && <div className="glass-panel p-6 text-slate-500">{t('empty')}</div>}
            </div>
          )}

          {tab === 'attendance' && <Attendance groupId={groupId} lessons={lessonList} students={g.students} />}
        </div>
      )}
    </AsyncState>
  );
}
