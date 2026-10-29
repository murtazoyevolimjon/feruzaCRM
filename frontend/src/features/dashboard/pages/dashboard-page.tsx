import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, GraduationCap, Plus, School, Sofa, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { GroupSummary, PaymentNotification, StudentStats } from '@/api/types';
import { AsyncState, Badge, EmptyState, ProgressBar, StatCard, useFetch } from '@/components/ui/common';
import { authStore } from '@/features/auth/store/auth.store';
import { FULL_ADMIN_ROLES } from '@/lib/constants';
import { formatDate, formatMoney, initials } from '@/lib/utils';

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const METHOD_LABEL: Record<string, string> = { KYN: 'KYN (onlayn)', CARD: 'Karta', TRANSFER: "Bank o'tkazma", CASH: 'Naqd' };
const BAR_TONES = ['from-indigo-500 to-violet-500', 'from-sky-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500', 'from-rose-400 to-pink-500'];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Xayrli tun';
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = authStore.getUser();
  const canWrite = !!user && FULL_ADMIN_ROLES.includes(user.role);
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
      {/* ---------- Salomlashish banneri ---------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-7 text-white shadow-lift sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 animate-blob rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 animate-blob rounded-full bg-fuchsia-400/25 blur-3xl [animation-delay:-6s]" />
        <div className="pointer-events-none absolute inset-0 opacity-[.08]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="animate-fade-up">
            <p className="flex items-center gap-2 text-[13px] text-indigo-100"><CalendarClock className="h-4 w-4" /> {formatDate(new Date())}</p>
            <h1 className="mt-1 !text-[28px] !text-white sm:!text-[32px]">{greeting()}, {user?.fullName?.split(' ')[0]} 👋</h1>
            <p className="mt-1.5 max-w-md text-indigo-100/90">O'quv markazingiz bugungi ko'rsatkichlari shu yerda.</p>
          </div>
          {canWrite && (
            <div className="flex animate-fade-up flex-wrap gap-3 [animation-delay:150ms]">
              <Link to="/admin/groups?new=1" className="btn rounded-full bg-white !px-5 text-indigo-700 shadow-lg hover:-translate-y-0.5 hover:shadow-xl">
                <Plus className="h-4 w-4" /> Yangi guruh
              </Link>
              <Link to="/admin/finance?pay=1" className="btn rounded-full bg-white/15 !px-5 text-white ring-1 ring-white/40 backdrop-blur hover:-translate-y-0.5 hover:bg-white/25">
                <Wallet className="h-4 w-4" /> To'lov qabul qilish
              </Link>
            </div>
          )}
        </div>
      </section>

      <AsyncState loading={loading} error={error}>
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Jami O'quvchilar"
            count={s?.totalStudents ?? 0}
            hint={`Faol: ${s?.activeStudents ?? 0} · Muzlatilgan: ${s?.frozen ?? 0} · Arxiv: ${s?.archived ?? 0}`}
            icon={GraduationCap}
            to="/admin/students"
          />
          <StatCard label="Faol Guruhlar" count={groups.length} hint={`Bugun dars: ${todays.length} ta guruh`} tone="ok" icon={School} to="/admin/groups" />
          <StatCard label="Bo'sh o'rinlar" count={Math.max(seats - taken, 0)} hint={`${taken} / ${seats} o'rin band`} tone="late" icon={Sofa} />
          <StatCard label="Oxirgi to'lovlar" count={recentTotal} format={(n) => formatMoney(Math.round(n))} hint={`Oxirgi ${payments.length} ta to'lov`} tone="bad" icon={Wallet} to="/admin/finance" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass-panel animate-fade-up p-5 [animation-delay:100ms] lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2>Bugungi Darslar Jadvali</h2>
              <Badge tone="sky">{todays.length} ta</Badge>
            </div>
            {todays.length === 0 ? (
              <EmptyState title={t('noLessonToday')} hint="Bugun hech bir guruhda dars rejalashtirilmagan" icon={CalendarClock} />
            ) : (
              <div className="stagger space-y-2.5">
                {todays.map((g) => (
                  <Link key={g.id} to={`/admin/groups/${g.id}`} className="group flex items-center gap-4 rounded-2xl border border-slate-100 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-card dark:border-slate-800">
                    <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[15px] font-bold text-white shadow-glow">{g.lessonTime}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{g.name} <span className="font-normal text-slate-400">· {g.courseName}</span></p>
                      <p className="truncate text-[12px] text-slate-500">{g.roomName} · {g.teacherName}</p>
                    </div>
                    <Badge tone="green">Faol</Badge>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-indigo-500" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel animate-fade-up p-5 [animation-delay:200ms]">
            <h2 className="mb-4">Kurslar Taqsimoti</h2>
            {courses.length === 0 && <EmptyState title={t('empty')} />}
            <div className="space-y-5">
              {courses.map(([name, count], i) => (
                <div key={name}>
                  <div className="mb-1.5 flex justify-between">
                    <span className="font-medium">{name}</span>
                    <span className="text-slate-500">{Math.round((count / groups.length) * 100)}% · {count} guruh</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-full origin-left animate-bar-grow rounded-full bg-gradient-to-r ${BAR_TONES[i % BAR_TONES.length]}`} style={{ width: `${(count / groups.length) * 100}%`, animationDelay: `${i * 120}ms` }} />
                  </div>
                </div>
              ))}
            </div>
            {courses.length > 0 && <div className="mt-5"><ProgressBar value={taken} max={seats} tone="ok" /><p className="mt-1.5 text-[12px] text-slate-500">Umumiy to'ldirilganlik: {seats ? Math.round((taken / seats) * 100) : 0}%</p></div>}
          </div>
        </div>

        <div className="glass-panel animate-fade-up p-5 [animation-delay:250ms]">
          <div className="mb-3 flex items-center justify-between">
            <h2>Oxirgi To'lovlar Oqimi</h2>
            <Link to="/admin/finance" className="flex items-center gap-1 text-[13px] font-semibold text-indigo-600 hover:gap-2 transition-all">Barchasi <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {payments.length === 0 ? (
            <EmptyState title={t('empty')} hint="Hali to'lovlar qabul qilinmagan" icon={Wallet} />
          ) : (
            <div className="stagger divide-y divide-slate-100 dark:divide-slate-800">
              {payments.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-[12px] font-bold text-white">{initials(p.studentName)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.studentName}</p>
                    <p className="truncate text-[12px] text-slate-500">{p.groupName} · {METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod} · {formatDate(p.paidAt)}</p>
                  </div>
                  <span className="font-bold text-emerald-600">+{formatMoney(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </AsyncState>
    </div>
  );
}
