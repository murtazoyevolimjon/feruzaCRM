import { useTranslation } from 'react-i18next';
import type { Student } from '@/api/types';
import { CrudPage, StatusBadge } from '@/components/ui/crud-page';
import { formatDate } from '@/lib/utils';

export default function StudentsPage() {
  const { t } = useTranslation();
  return (
    <CrudPage<Student>
      title={t('students')}
      listUrl="/students/all"
      createUrl="/students"
      updateUrl={(id) => `/students/${id}`}
      updateMethod="patch"
      deleteUrl={(id) => `/students/${id}`}
      resetPasswordUrl={(id) => `/students/${id}/reset-password`}
      multipart
      statusFilter
      searchText={(r) => `${r.fullName} ${r.email}`}
      prepare={(v) => ({ fullName: v.fullName, email: v.email, password: v.password })}
      columns={[
        { header: 'F.I.Sh', render: (r) => r.fullName },
        { header: t('email'), render: (r) => r.email },
        { header: "Qo'shilgan sana", render: (r) => formatDate(r.created_at) },
        { header: t('status'), render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { name: 'fullName', label: 'F.I.Sh', required: true },
        { name: 'email', label: t('email'), type: 'email', required: true },
        { name: 'password', label: t('password'), type: 'password', required: true, createOnly: true },
      ]}
    />
  );
}
