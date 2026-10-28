import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { get } from '@/api/endpoints';
import type { GroupDetails, GroupSummary, PaymentNotification } from '@/api/types';
import { AsyncState, Badge, Field, Modal, StatCard, useFetch } from '@/components/ui/common';
import { authStore } from '@/features/auth/store/auth.store';
import { PaymentModal } from '@/features/payments/components/payment-modal';
import { FULL_ADMIN_ROLES } from '@/lib/constants';
import { errorMessage, formatDate, formatMoney, initials } from '@/lib/utils';

const METHOD: Record<string, string> = { KYN: 'KYN (onlayn)', CARD: 'Karta', TRANSFER: "Bank o'tkazma" };

/** Guruh -> talaba tanlanadi, so'ng to'lov modali ochiladi. */
function PaymentPicker({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const groups = useFetch<GroupSummary[]>('/groups', undefined, []);
  const [groupId, setGroupId] = useState('');
  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    setDetails(null);
    setStudentId('');
    if (!groupId) return;
    get<GroupDetails>(`/groups/${groupId}`).then(setDetails).catch((e) => setError(errorMessage(e)));
  }, [groupId]);

  const student = details?.students.find((s) => String(s.id) === studentId);

  if (paying && details && student) {
    return (
      <PaymentModal
        group={{ name: details.name, studentGroupId: student.studentGroupId }}
        studentId={student.id}
        price={details.course.price}
        onClose={onClose}
        onDone={onDone}
      />
    );
  }

  return (
    <Modal title="To'lov Qabul Qilish" onClose={onClose}>
      <Field label="Guruh">
        <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Guruhni tanlang</option>
          {(Array.isArray(groups.data) ? groups.data : []).map((g) => <option key={g.id} value={g.id}>{g.name} — {g.courseName}</option>)}
        </select>
      </Field>
      <Field label="O'quvchi">
        <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!details}>
          <option value="">{details && details.students.length === 0 ? "Guruhda o'quvchi yo'q" : "O'quvchini tanlang"}</option>
          {details?.students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
        </select>
      </Field>
      {details && (
        <p className="mb-3 rounded-lg bg-brand-soft p-3 text-brand">
          Oylik standart narx: <b>{formatMoney(details.course.price)}</b>
        </p>
      )}
      {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-bad">{error}</p>}
      <button className="btn btn-primary w-full" disabled={!student} onClick={() => setPaying(true)}>Davom etish</button>
    </Modal>
  );
}

export default function FinancePage() {
  const role = authStore.getResolvedRole();
  const canPay = !!role && FULL_ADMIN_ROLES.includes(role);
  const [params, setParams] = useSearchParams();
  const [picking, setPicking] = useState(canPay && params.get('pay') === '1');
  const { data, loading, error, reload } = useFetch<PaymentNotification[]>('/payments/admin-notifications', undefined, []);
  const rows = Array.isArray(data) ? data : [];

  useEffect(() => {
    if (params.get('pay') === '1') {
      if (canPay) setPicking(true);
      const next = new URLSearchParams(params);
      next.delete('pay');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const today = new Date().toDateString();
  const todaySum = rows.filter((r) => r.paidAt && new Date(r.paidAt).toDateString() === today).reduce((s, r) => s + r.amount, 0);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const byMethod = (m: string) => rows.filter((r) => r.paymentMethod === m).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto">Moliya va Kassa</h1>
        {canPay && (
          <button className="btn btn-primary" onClick={() => setPicking(true)}>
            <Wallet className="h-4 w-4" /> + To'lov Qabul Qilish
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bugungi tushum" value={formatMoney(todaySum)} tone="ok" />
        <StatCard label="Oxirgi 20 ta to'lov" value={formatMoney(total)} hint={`${rows.length} ta tranzaksiya`} />
        <StatCard label="KYN (onlayn)" value={formatMoney(byMethod('KYN'))} />
        <StatCard label="Karta" value={formatMoney(byMethod('CARD'))} />
      </div>

      <div className="glass-panel overflow-x-auto">
        <h2 className="p-4">Tranzaksiyalar Reyestri</h2>
        <AsyncState loading={loading} error={error} empty={rows.length === 0}>
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr><th className="th">Kvitansiya</th><th className="th">O'quvchi va guruh</th><th className="th">Usul</th><th className="th">Summa</th><th className="th">Sana</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 text-slate-500">#TX-{r.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand">{initials(r.studentName)}</span>
                      <div><p className="font-medium">{r.studentName}</p><p className="text-[12px] text-slate-500">{r.groupName}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge tone="sky">{METHOD[r.paymentMethod] ?? r.paymentMethod}</Badge></td>
                  <td className="px-4 py-3 font-semibold text-ok">+{formatMoney(r.amount)}</td>
                  <td className="px-4 py-3">{formatDate(r.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AsyncState>
      </div>

      {picking && <PaymentPicker onClose={() => setPicking(false)} onDone={() => void reload()} />}
    </div>
  );
}
