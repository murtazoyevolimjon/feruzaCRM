import { useTranslation } from 'react-i18next';
import type { Employee } from '@/api/types';
import { CrudPage, StatusBadge } from '@/components/ui/crud-page';

const ROLES = ['ADMIN', 'MANAGEMENT', 'ADMINSTRATOR', 'SUPERADMIN'].map((r) => ({ value: r, label: r }));

export default function EmployeesPage() {
  const { t } = useTranslation();
  return (
    <CrudPage<Employee>
      title={t('managementEmployees')}
      listUrl="/users"
      createUrl="/users"
      updateUrl={(id) => `/users/${id}`}
      deleteUrl={(id) => `/users/${id}`}
      statusFilter
      searchText={(r) => `${r.fullName} ${r.email} ${r.role}`}
      columns={[
        { header: 'F.I.Sh', render: (r) => r.fullName },
        { header: t('email'), render: (r) => r.email },
        { header: 'Rol', render: (r) => r.role },
        { header: 'Lavozim', render: (r) => r.position ?? '—' },
        { header: t('status'), render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { name: 'fullName', label: 'F.I.Sh', required: true },
        { name: 'email', label: t('email'), type: 'email', required: true },
        { name: 'password', label: t('password'), type: 'password', required: true, createOnly: true },
        { name: 'role', label: 'Rol', type: 'select', options: ROLES, required: true },
        { name: 'position', label: 'Lavozim' },
        { name: 'address', label: 'Manzil' },
      ]}
      prepare={(v) => {
        // Faqat DTO qabul qiladigan maydonlarni yuboramiz
        const { fullName, email, password, role, position, address } = v;
        return { fullName, email, password, role, position, address };
      }}
    />
  );
}
