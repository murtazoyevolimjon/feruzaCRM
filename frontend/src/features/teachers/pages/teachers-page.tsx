import { useTranslation } from 'react-i18next';
import type { Teacher } from '@/api/types';
import { CrudPage, StatusBadge } from '@/components/ui/crud-page';

export default function TeachersPage() {
  const { t } = useTranslation();
  return (
    <CrudPage<Teacher>
      title={t('teachers')}
      listUrl="/teachers/all"
      createUrl="/teachers"
      updateUrl={(id) => `/teachers/${id}`}
      deleteUrl={(id) => `/teachers/${id}`}
      resetPasswordUrl={(id) => `/teachers/${id}/reset-password`}
      multipart
      statusFilter
      searchText={(r) => `${r.fullName} ${r.email}`}
      prepare={(v) => ({ fullName: v.fullName, email: v.email, password: v.password, experience: v.experience })}
      columns={[
        { header: 'F.I.Sh', render: (r) => r.fullName },
        { header: t('email'), render: (r) => r.email },
        { header: 'Tajriba (yil)', render: (r) => r.experience },
        { header: t('status'), render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { name: 'fullName', label: 'F.I.Sh', required: true },
        { name: 'email', label: t('email'), type: 'email', required: true },
        { name: 'password', label: t('password'), type: 'password', required: true, createOnly: true },
        { name: 'experience', label: 'Tajriba (yil)', type: 'number', required: true },
      ]}
    />
  );
}
