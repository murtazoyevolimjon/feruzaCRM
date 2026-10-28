import { useTranslation } from 'react-i18next';
import type { Room } from '@/api/types';
import { CrudPage, StatusBadge } from '@/components/ui/crud-page';

export default function RoomsPage() {
  const { t } = useTranslation();
  return (
    <CrudPage<Room>
      title={t('managementRooms')}
      listUrl="/rooms/all"
      createUrl="/rooms"
      updateUrl={(id) => `/rooms/${id}`}
      updateMethod="patch"
      deleteUrl={(id) => `/rooms/${id}`}
      searchText={(r) => r.name}
      columns={[
        { header: 'Nomi', render: (r) => r.name },
        { header: "Sig'imi", render: (r) => r.capacity },
        { header: t('status'), render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { name: 'name', label: 'Nomi', required: true },
        { name: 'capacity', label: "Sig'imi", type: 'number', required: true },
      ]}
      prepare={(v) => ({ name: v.name, capacity: Number(v.capacity) })}
    />
  );
}
