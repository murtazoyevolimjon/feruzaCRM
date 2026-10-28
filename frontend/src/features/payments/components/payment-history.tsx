import { useTranslation } from 'react-i18next';
import type { Payment } from '@/api/types';
import { AsyncState, Badge, statusTone, useFetch } from '@/components/ui/common';
import { formatDate, formatMoney } from '@/lib/utils';

export function PaymentHistory({ refreshKey = 0 }: { refreshKey?: number }) {
  const { t } = useTranslation();
  const { data, loading, error } = useFetch<Payment[]>('/payments/my-payments', { k: refreshKey }, []);
  const rows = Array.isArray(data) ? data : [];
  return (
    <div className="glass-panel overflow-x-auto">
      <h2 className="p-4 font-semibold">{t('paymentHistory')}</h2>
      <AsyncState loading={loading} error={error} empty={rows.length === 0}>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="px-4 py-2">Sana</th><th>Guruh</th><th>Usul</th><th>Summa</th><th>Holat</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2">{formatDate(p.paidAt ?? p.created_at)}</td>
                <td>{p.groupName}</td>
                <td>{p.paymentMethod}</td>
                <td>{formatMoney(p.amount)}</td>
                <td><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </AsyncState>
    </div>
  );
}
