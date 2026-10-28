import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GroupSummary, PaymentNotification, StudentStats } from '@/api/types';
import { AsyncState, Badge, ProgressBar, StatCard, useFetch } from '@/components/ui/common';
import { formatDate, formatMoney } from '@/lib/utils';

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const METHOD_LABEL: Record<string, string> = { KYN: 'KYN (onlayn)', CARD: 'Karta', TRANSFER: "Bank o'tkazma" };

export default function DashboardPage() {
  const { t } = useTranslation();
  const stats = useFetch<StudentStats>('/students/stats/summary');
  const groupsRes = useFetch<GroupSummary[]>('/groups', undefined, []);
  const payRes = useFetch<PaymentNotification[]>('/payments/admin-notifications', undefined, []);

  const groups = Array.isArray(groupsRes.data) ? groupsRes.data : [];
  const payments = Array.isArray(payRes.data) ? payRes.data : [];
  const s = stats.data;

  const seats = groups.reduce((sum, g) => sum + g.roomCapacity, 0);
  const taken = groups.reduce((sum, g) => sum + g.studentsCount, 0);
  const recentTotal = payments.reduce((sum, p) => sum + p.amount, 0);

  // Kurslar taqsimoti: guruhlar soni bo'yicha
  const byCourse = new Map<string, number>();
  groups.forEach((g) => byCourse.set(g.courseName, (byCourse.get(g.courseName) ?? 0) + 1));
  const courses = [...byCourse.entries()].sort((a, b) => b[1] - a[1]);

  const today = DAYS[new Date().getDay()];
  const todays = groups.filter((g) => g.weekDays.includes(today)).sort((a, b) => a.lessonTime.localeCompare(b.lessonTime));

  const loading = stats.loading || groupsRes.loading || payRes.loading;
  const error = stats.error ?? groupsRes.error ?? payRes.error;

  return (
    <div className="space-y-6">
      <div>
        <h1>O'quv Markazi Ko'rsatkichlari</h1>
        <p className="text-slate-500">{formatDate(new Date())}</p>
      </div>

      <AsyncState loading={loading} error={error}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Jami O'quvchilar"
            value={s?.totalStudents ?? 0}
            hint={`Faol: ${s?.activeStudents ?? 0} · Muzlatilgan: ${s?.frozen ?? 0} · Arxiv: ${s?.archived ?? 0}`}
            to="/admin/students"
          />
          <StatCard label="Faol Guruhlar" value={groups.length} hint={`Bugun dars: ${todays.length} ta guruh`} tone="ok" to="/admin/groups" />
          <StatCard label="Bo'sh o'rinlar" value={Math.max(seats - taken, 0)} hint={`${taken} / ${seats} o'rin band`} tone="late" />
          <StatCard label="Oxirgi to'lovlar" value={formatMoney(recentTotal)} hint={`Oxirgi ${payments.length} ta to'lov`} tone="ok" to="/admin/finance" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass-panel p-5 lg:col-span-2">
            <h2 className="mb-4">Bugungi Darslar Jadvali</h2>
            {todays.length === 0 ? (
              <p className="py-6 text-center text-slate-500">{t('noLessonToday')}</p>
            ) : (
              <table className="w-full text-left">
                <thead><tr><th className="th">Vaqt</th><th className="th">Guruh</th><th className="th">Xona</th><th className="th">O'qituvchi</th><th className="th">Holat</th></tr></thead>
                <tbody>
                  {todays.map((g) => (
                    <tr key={g.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3 font-medium">{g.lessonTime}</td>
                      <td className="px-4 py-3"><Link className="text-brand hover:underline" to={`/admin/groups/${g.id}`}>{g.name}</Link></td>
                      <td className="px-4 py-3">{g.roomName}</td>
                      <td className="px-4 py-3">{g.teacherName}</td>
                      <td className="px-4 py-3"><Badge tone="green">Faol</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="glass-panel p-5">
            <h2 className="mb-4">Kurslar Taqsimoti</h2>
            {courses.length === 0 && <p className="py-6 text-center text-slate-500">{t('empty')}</p>}
            <div className="space-y-4">
              {courses.map(([name, count]) => (
                <div key={name}>
                  <div className="mb-1 flex justify-between"><span className="font-medium">{name}</span><span className="text-slate-500">{Math.round((count / groups.length) * 100)}% · {count} guruh</span></div>
                  <ProgressBar value={count} max={groups.length} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel p-5">
          <h2 className="mb-4">Oxirgi To'lovlar Oqimi</h2>
          {payments.length === 0 ? (
            <p className="py-6 text-center text-slate-500">{t('empty')}</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{p.studentName}</p>
                    <p className="text-[12px] text-slate-500">{p.groupName} · {METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod} · {formatDate(p.paidAt)}</p>
                  </div>
                  <span className="font-semibold text-ok">+{formatMoney(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </AsyncState>
    </div>
  );
}
