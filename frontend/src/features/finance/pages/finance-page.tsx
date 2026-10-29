import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, PiggyBank, Trash2, Wallet } from 'lucide-react';
import { get, send } from '@/api/endpoints';
import type { Debtor, Expense, FinanceSummary, GroupDetails, GroupSummary, PaymentNotification } from '@/api/types';
import { AsyncState, Badge, Field, Modal, Pager, StatCard, useFetch } from '@/components/ui/common';
import { authStore } from '@/features/auth/store/auth.store';
import { PaymentModal } from '@/features/payments/components/payment-modal';
import { FULL_ADMIN_ROLES } from '@/lib/constants';
import { errorMessage, formatDate, formatMoney, initials } from '@/lib/utils';

const METHOD: Record<string, string> = { KYN: 'KYN (onlayn)', CARD: 'Karta', TRANSFER: "Bank o'tkazma", CASH: 'Naqd' };
const CATEGORIES = ['Ijara', 'Maosh', 'Kommunal', 'Marketing', 'Jihozlar', 'Boshqa'];

type Tab = 'overview' | 'income' | 'expense' | 'debtors';
const TABS: Array<[Tab, string]> = [
  ['overview', 'Umumiy'],
  ['income', 'Kirim'],
  ['expense', 'Chiqim'],
  ['debtors', 'Qarzdorlar'],
];

const fmt = (n: number) => formatMoney(Math.round(n));

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

interface PayTarget {
  groupName: string;
  studentGroupId: number;
  studentId: number;
  price?: number;
  priceLabel?: string;
}

/** Guruh -> o'quvchi tanlanadi, so'ng to'lov modali ochiladi. */
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
        allowCash
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
        <p className="mb-3 rounded-lg bg-brand-soft p-3 text-brand">Oylik standart narx: <b>{formatMoney(details.course.price)}</b></p>
      )}
      {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-bad">{error}</p>}
      <button className="btn btn-primary w-full" disabled={!student} onClick={() => setPaying(true)}>Davom etish</button>
    </Modal>
  );
}

function ExpenseModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ title: '', category: CATEGORIES[0], amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await send('post', '/finance/expenses', {
        title: v.title,
        category: v.category,
        amount: Number(v.amount),
        date: v.date,
        note: v.note || undefined,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Chiqim qo'shish" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Nomi"><input className="input" required placeholder="Ofis ijarasi" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
        <Field label="Turi">
          <select className="input" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Summa (UZS)"><input className="input" type="number" min={1} required value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></Field>
          <Field label="Sana"><input className="input" type="date" required value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></Field>
        </div>
        <Field label="Izoh"><input className="input" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></Field>
        {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-bad">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Bekor qilish</button>
          <button className="btn btn-primary" disabled={busy}>Saqlash</button>
        </div>
      </form>
    </Modal>
  );
}

export default function FinancePage() {
  const role = authStore.getResolvedRole();
  const canWrite = !!role && FULL_ADMIN_ROLES.includes(role);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('overview');
  const [month, setMonth] = useState(currentMonth());
  const [picking, setPicking] = useState(canWrite && params.get('pay') === '1');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((n) => n + 1);

  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const changeMonth = (value: string) => {
    setMonth(value);
    setIncomePage(1);
    setExpensePage(1);
  };

  const q = { month, v: version };
  const summary = useFetch<FinanceSummary>('/finance/summary', q);
  const income = useFetch<PaymentNotification[]>(tab === 'income' ? '/finance/payments' : null, { ...q, page: incomePage }, []);
  const expenses = useFetch<Expense[]>(tab === 'expense' || tab === 'overview' ? '/finance/expenses' : null, { ...q, page: expensePage }, []);
  const debtors = useFetch<Debtor[]>('/finance/debtors', { v: version }, []);

  useEffect(() => {
    if (params.get('pay') === '1') {
      if (canWrite) setPicking(true);
      const next = new URLSearchParams(params);
      next.delete('pay');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const s = summary.data;
  const incomeRows = Array.isArray(income.data) ? income.data : [];
  const expenseRows = Array.isArray(expenses.data) ? expenses.data : [];
  const debtorRows = Array.isArray(debtors.data) ? debtors.data : [];

  const removeExpense = async (id: number) => {
    if (!window.confirm("Chiqimni o'chirasizmi?")) return;
    try {
      await send('delete', `/finance/expenses/${id}`);
      refresh();
    } catch (e) {
      window.alert(errorMessage(e));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto">Moliya va Kassa</h1>
        <input type="month" className="input w-44" value={month} onChange={(e) => e.target.value && changeMonth(e.target.value)} />
        {canWrite && (
          <>
            <button className="btn btn-ghost" onClick={() => setExpenseOpen(true)}>− Chiqim qo'shish</button>
            <button className="btn btn-primary" onClick={() => setPicking(true)}><Wallet className="h-4 w-4" /> + To'lov Qabul Qilish</button>
          </>
        )}
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Kirim (markazga kirgan)" count={s?.income ?? 0} format={fmt} tone="ok" icon={ArrowDownLeft} />
        <StatCard label="Chiqim (markazdan ketgan)" count={s?.expense ?? 0} format={fmt} tone="bad" icon={ArrowUpRight} />
        <StatCard label="Sof foyda" count={s?.profit ?? 0} format={fmt} tone={(s?.profit ?? 0) >= 0 ? 'ok' : 'bad'} icon={PiggyBank} />
        <StatCard label="Qarzdorlik" count={s?.debtTotal ?? 0} format={fmt} hint={`${s?.debtorCount ?? 0} ta qarzdor o'quvchi`} tone="late" icon={AlertCircle} />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`pill ${tab === k ? 'pill-active' : 'pill-idle'}`}>
            {label}{k === 'debtors' && debtorRows.length > 0 ? ` (${debtorRows.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <AsyncState loading={summary.loading} error={summary.error}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass-panel p-5">
              <h2 className="mb-3">Kirim usullari bo'yicha</h2>
              {Object.keys(s?.incomeByMethod ?? {}).length === 0 && <p className="text-slate-500">Bu oyda kirim yo'q</p>}
              {Object.entries(s?.incomeByMethod ?? {}).map(([m, amount]) => (
                <div key={m} className="flex justify-between border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
                  <span>{METHOD[m] ?? m}</span><b className="text-ok">+{formatMoney(amount)}</b>
                </div>
              ))}
            </div>
            <div className="glass-panel p-5">
              <h2 className="mb-3">Chiqim turlari bo'yicha</h2>
              {Object.keys(s?.expenseByCategory ?? {}).length === 0 && <p className="text-slate-500">Bu oyda chiqim yo'q</p>}
              {Object.entries(s?.expenseByCategory ?? {}).map(([c, amount]) => (
                <div key={c} className="flex justify-between border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
                  <span>{c}</span><b className="text-bad">−{formatMoney(amount)}</b>
                </div>
              ))}
            </div>
          </div>
        </AsyncState>
      )}

      {tab === 'income' && (
        <div className="glass-panel overflow-x-auto">
          <h2 className="p-4">Kirimlar reyestri</h2>
          <AsyncState loading={income.loading} error={income.error} empty={incomeRows.length === 0}>
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr><th className="th">Kvitansiya</th><th className="th">O'quvchi va guruh</th><th className="th">Usul</th><th className="th">Summa</th><th className="th">Sana</th></tr>
              </thead>
              <tbody>
                {incomeRows.map((r) => (
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
          <Pager meta={income.meta} onPage={setIncomePage} />
        </div>
      )}

      {tab === 'expense' && (
        <div className="glass-panel overflow-x-auto">
          <h2 className="p-4">Chiqimlar reyestri</h2>
          <AsyncState loading={expenses.loading} error={expenses.error} empty={expenseRows.length === 0}>
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr><th className="th">Nomi</th><th className="th">Turi</th><th className="th">Summa</th><th className="th">Sana</th><th className="th">Kiritdi</th><th className="th" /></tr>
              </thead>
              <tbody>
                {expenseRows.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3"><p className="font-medium">{e.title}</p>{e.note && <p className="text-[12px] text-slate-500">{e.note}</p>}</td>
                    <td className="px-4 py-3"><Badge tone="amber">{e.category}</Badge></td>
                    <td className="px-4 py-3 font-semibold text-bad">−{formatMoney(e.amount)}</td>
                    <td className="px-4 py-3">{formatDate(e.date)}</td>
                    <td className="px-4 py-3">{e.createdBy}</td>
                    <td className="px-4 py-3 text-right">
                      {canWrite && <button className="p-1.5 hover:text-bad" onClick={() => removeExpense(e.id)} aria-label="O'chirish"><Trash2 className="h-4 w-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AsyncState>
          <Pager meta={expenses.meta} onPage={setExpensePage} />
        </div>
      )}

      {tab === 'debtors' && (
        <div className="glass-panel overflow-x-auto">
          <h2 className="p-4">Qarzdor o'quvchilar</h2>
          <AsyncState loading={debtors.loading} error={debtors.error} empty={debtorRows.length === 0}>
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr><th className="th">O'quvchi</th><th className="th">Guruh</th><th className="th">Oylar</th><th className="th">Kutilgan</th><th className="th">To'langan</th><th className="th">Qarz</th><th className="th" /></tr>
              </thead>
              <tbody>
                {debtorRows.map((d) => (
                  <tr key={d.studentGroupId} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-[12px] font-semibold text-bad">{initials(d.fullName)}</span>
                        <div><p className="font-medium">{d.fullName}</p><p className="text-[12px] text-slate-500">{d.email}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{d.groupName}<p className="text-[12px] text-slate-500">{d.courseName}</p></td>
                    <td className="px-4 py-3">{d.monthsDue} oy × {formatMoney(d.monthlyPrice)}</td>
                    <td className="px-4 py-3">{formatMoney(d.expected)}</td>
                    <td className="px-4 py-3 text-ok">{formatMoney(d.paid)}</td>
                    <td className="px-4 py-3"><Badge tone="rose">−{formatMoney(d.debt)}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {canWrite && (
                        <button
                          className="btn btn-primary py-1.5"
                          onClick={() => setPayTarget({ groupName: d.groupName, studentGroupId: d.studentGroupId, studentId: d.studentId, price: d.debt, priceLabel: 'Qarzni yopish' })}
                        >
                          To'lov qabul qilish
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AsyncState>
        </div>
      )}

      {picking && <PaymentPicker onClose={() => setPicking(false)} onDone={refresh} />}
      {expenseOpen && <ExpenseModal onClose={() => setExpenseOpen(false)} onDone={refresh} />}
      {payTarget && (
        <PaymentModal
          group={{ name: payTarget.groupName, studentGroupId: payTarget.studentGroupId }}
          studentId={payTarget.studentId}
          price={payTarget.price}
          priceLabel={payTarget.priceLabel}
          allowCash
          onClose={() => setPayTarget(null)}
          onDone={refresh}
        />
      )}
    </div>
  );
}
