import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupSummary } from '@/api/types';
import { AsyncState, useFetch } from '@/components/ui/common';
import { PaymentHistory } from '../components/payment-history';
import { PaymentModal } from '../components/payment-modal';

export default function StudentPaymentsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useFetch<GroupSummary[]>('/students/my/groups', undefined, []);
  const [paying, setPaying] = useState<GroupSummary | null>(null);
  const [refresh, setRefresh] = useState(0);
  const groups = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('payments')}</h1>
      <AsyncState loading={loading} error={error} empty={groups.length === 0}>
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.id} className="glass-panel flex items-center justify-between p-4">
              <div><p className="font-semibold">{g.name}</p><p className="text-sm text-slate-500">{g.courseName}</p></div>
              <button className="btn btn-primary" onClick={() => setPaying(g)}>{t('pay')}</button>
            </div>
          ))}
        </div>
      </AsyncState>
      <PaymentHistory refreshKey={refresh} />
      {paying && <PaymentModal group={paying} onClose={() => setPaying(null)} onDone={() => setRefresh((n) => n + 1)} />}
    </div>
  );
}
