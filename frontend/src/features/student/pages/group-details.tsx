import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { send, toFormData } from '@/api/endpoints';
import type { Homework, Lesson, LessonVideo } from '@/api/types';
import { AsyncState, Badge, statusTone, useFetch } from '@/components/ui/common';
import { errorMessage, formatDate } from '@/lib/utils';

function HomeworkItem({ hw, onDone }: { hw: Homework; onDone: () => void }) {
  const [text, setText] = useState(hw.response?.title ?? '');
  const [file, setFile] = useState<File>();
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await send(hw.response ? 'put' : 'post', '/homework-response', toFormData({ homeworkId: hw.id, title: text, file }));
      onDone();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };

  return (
    <form onSubmit={submit} className="glass-panel space-y-2 p-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium">{hw.title}</p>
        {hw.result ? <Badge tone={statusTone(hw.result.status)}>{hw.result.status} · {hw.result.score}</Badge> : hw.response ? <Badge tone="amber">PENDING</Badge> : <Badge>NOT_REVIEWED</Badge>}
      </div>
      {hw.file && <a className="text-sky-600 underline" href={hw.file} target="_blank" rel="noreferrer">Vazifa fayli</a>}
      <textarea className="input" required placeholder="Javobingiz" value={text} onChange={(e) => setText(e.target.value)} />
      <input type="file" className="input" onChange={(e) => setFile(e.target.files?.[0])} />
      {msg && <p className="text-rose-700">{msg}</p>}
      <button className="btn btn-primary">{hw.response ? 'Qayta yuborish' : 'Topshirish'}</button>
    </form>
  );
}

export default function StudentGroupDetails() {
  const { t } = useTranslation();
  const groupId = Number(useParams().id);
  const [tab, setTab] = useState<'lessons' | 'homework' | 'videos'>('lessons');
  const lessons = useFetch<Lesson[]>(`/students/my/lessons/${groupId}`, undefined, []);
  const homework = useFetch<Homework[]>(`/students/my/group/homework/${groupId}`, undefined, []);
  const videos = useFetch<LessonVideo[]>(`/students/my/group/lessonVideo/${groupId}`, undefined, []);
  const arr = <T,>(v?: T[]) => (Array.isArray(v) ? v : []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([['lessons', t('lessons')], ['homework', t('homework')], ['videos', t('videos')]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`pill ${tab === k ? 'pill-active' : 'pill-idle'}`}>{label}</button>
        ))}
      </div>
      {tab === 'lessons' && (
        <AsyncState loading={lessons.loading} error={lessons.error} empty={arr(lessons.data).length === 0}>
          {arr(lessons.data).map((l) => <div key={l.id} className="glass-panel flex justify-between p-3 text-sm"><span>{l.title}</span><span className="text-slate-500">{formatDate(l.date)}</span></div>)}
        </AsyncState>
      )}
      {tab === 'homework' && (
        <AsyncState loading={homework.loading} error={homework.error} empty={arr(homework.data).length === 0}>
          {arr(homework.data).map((h) => <HomeworkItem key={h.id} hw={h} onDone={() => void homework.reload()} />)}
        </AsyncState>
      )}
      {tab === 'videos' && (
        <AsyncState loading={videos.loading} error={videos.error} empty={arr(videos.data).length === 0}>
          <div className="grid gap-4 sm:grid-cols-2">
            {arr(videos.data).map((v) => <div key={v.id} className="glass-panel p-3"><p className="mb-2 text-sm font-medium">{v.lesson?.title}</p><video src={v.file} controls className="w-full rounded-xl" /></div>)}
          </div>
        </AsyncState>
      )}
    </div>
  );
}
