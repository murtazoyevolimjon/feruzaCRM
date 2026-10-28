import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GroupSummary } from '@/api/types';
import { AsyncState, useFetch } from '@/components/ui/common';

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/** Bugungi darslar = bugungi hafta kuniga to'g'ri keladigan guruhlar. */
export default function TeacherDashboardPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useFetch<GroupSummary[]>('/teachers/my/groups', undefined, []);
  const today = DAYS[new Date().getDay()];
  const todays = (Array.isArray(data) ? data : [])
    .filter((g) => g.weekDays.includes(today))
    .sort((a, b) => a.lessonTime.localeCompare(b.lessonTime));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('lessonSchedule')}</h1>
      <AsyncState loading={loading} error={error}>
        {todays.length === 0 && <div className="glass-panel p-5 text-slate-500">{t('noLessonToday')}</div>}
        {todays.map((g) => (
          <Link key={g.id} to={`/teacher/groups/${g.id}`} className="glass-panel flex flex-wrap justify-between gap-2 p-4 text-sm">
            <span className="font-medium">{g.name} — {g.courseName}</span>
            <span className="text-slate-500">{g.lessonTime} · {g.roomName}</span>
          </Link>
        ))}
      </AsyncState>
    </div>
  );
}
