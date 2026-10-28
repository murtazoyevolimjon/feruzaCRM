import { useTranslation } from 'react-i18next';
import type { Course } from '@/api/types';
import { CrudPage, StatusBadge } from '@/components/ui/crud-page';
import { formatMoney } from '@/lib/utils';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((l) => ({ value: l, label: l }));
const num = (v: unknown) => (v === undefined || v === '' ? undefined : Number(v));

export default function CoursesPage() {
  const { t } = useTranslation();
  return (
    <CrudPage<Course>
      title={t('managementCourses')}
      listUrl="/course/all"
      createUrl="/course"
      updateUrl={(id) => `/course/${id}`}
      updateMethod="patch"
      deleteUrl={(id) => `/course/${id}`}
      searchText={(r) => r.name}
      columns={[
        { header: 'Nomi', render: (r) => r.name },
        { header: 'Davomiyligi', render: (r) => `${r.durationMonth} oy` },
        { header: 'Dars', render: (r) => `${r.durationLesson} daqiqa` },
        { header: 'Narxi', render: (r) => formatMoney(r.price) },
        { header: t('status'), render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { name: 'name', label: 'Nomi', required: true },
        { name: 'durationMonth', label: 'Davomiyligi (oy)', type: 'number', required: true },
        { name: 'durationLesson', label: 'Dars davomiyligi (daqiqa)', type: 'number', required: true },
        { name: 'price', label: "Narxi (so'm)", type: 'number', required: true },
        { name: 'level', label: 'Daraja', type: 'select', options: LEVELS },
        { name: 'description', label: 'Tavsif', type: 'textarea' },
      ]}
      prepare={(v) => ({
        name: v.name,
        durationMonth: num(v.durationMonth),
        durationLesson: num(v.durationLesson),
        price: num(v.price),
        level: v.level || undefined,
        description: v.description || undefined,
      })}
    />
  );
}
