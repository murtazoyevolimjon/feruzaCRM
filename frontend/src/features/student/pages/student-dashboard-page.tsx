import { useTranslation } from 'react-i18next';
import type { StudentLesson } from '@/api/types';
import { AsyncState, useFetch } from '@/components/ui/common';
import { formatDate } from '@/lib/utils';

/** Talaba va o'qituvchi bosh sahifasi: dars jadvali. */
export default function ScheduleDashboard({ url }: { url: string }) {
  const { t } = useTranslation();
  const { data, loading, error } = useFetch<StudentLesson[]>(url, undefined, []);
  const lessons = Array.isArray(data) ? data : [];
  const today = new Date().toDateString();
  const todays = lessons.filter((l) => new Date(l.date).toDateString() === today);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('lessonSchedule')}</h1>
      <AsyncState loading={loading} error={error}>
        {todays.length === 0 && <div className="glass-panel p-5 text-slate-500">{t('noLessonToday')}</div>}
        {todays.map((l) => <LessonRow key={l.id} l={l} />)}
        {lessons.length > 0 && <h2 className="pt-2 font-semibold">{t('lessons')}</h2>}
        {lessons.filter((l) => !todays.includes(l)).slice(-20).reverse().map((l) => <LessonRow key={l.id} l={l} />)}
      </AsyncState>
    </div>
  );
}

function LessonRow({ l }: { l: StudentLesson }) {
  return (
    <div className="glass-panel flex flex-wrap justify-between gap-2 p-4 text-sm">
      <span className="font-medium">{l.title}</span>
      <span className="text-slate-500">{l.groupName} · {l.roomName} · {formatDate(l.date)} {l.time}</span>
    </div>
  );
}
