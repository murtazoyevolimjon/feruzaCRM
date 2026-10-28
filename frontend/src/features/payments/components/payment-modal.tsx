import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { send } from '@/api/endpoints';
import type { GroupSummary, Payment, PaymentMethod } from '@/api/types';
import { Field, Modal } from '@/components/ui/common';
import { errorMessage } from '@/lib/utils';

interface CardStart {
  data: { otpSessionId: string; maskedPhone: string };
}

/** Karta to'lovi: to'liq karta raqami yuborilmaydi — faqat oxirgi 4 raqam, muddat va telefon. */
export function PaymentModal({
  group,
  studentId,
  price,
  onClose,
  onDone,
}: {
  group: Pick<GroupSummary, 'name' | 'studentGroupId'>;
  /** Admin boshqa talaba nomidan to'lov yaratganda beriladi */
  studentId?: number;
  /** Kurs narxi: tezkor summa tugmalari uchun */
  price?: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(String(price ?? 500000));
  const [method, setMethod] = useState<PaymentMethod>('KYN');
  const [cardLast4, setLast4] = useState('');
  const [cardExpiry, setExpiry] = useState('');
  const [phoneNumber, setPhone] = useState('');
  const [otp, setOtp] = useState<{ sessionId: string; phone: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        amount: Number(amount),
        studentGroupId: group.studentGroupId,
        ...(studentId ? { studentId } : {}),
        description: `${group.name} uchun to'lov`,
        paymentMethod: method,
        ...(method === 'CARD' ? { cardLast4, cardExpiry, phoneNumber } : {}),
      };
      if (method === 'CARD') {
        const res = await send<CardStart>('post', '/payments/create', body);
        setOtp({ sessionId: res.data.otpSessionId, phone: res.data.maskedPhone });
      } else {
        const res = await send<{ data: Payment }>('post', '/payments/create', body);
        if (res.data.paymentUrl) window.location.assign(res.data.paymentUrl);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setBusy(true);
    setError(null);
    try {
      await send('post', '/payments/confirm-card-otp', { otpSessionId: otp.sessionId, code });
      setSuccess(true);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`${t('pay')} — ${group.name}`} onClose={onClose}>
      {success ? (
        <p className="rounded-lg bg-emerald-50 p-4 text-ok">To'lov muvaffaqiyatli amalga oshirildi.</p>
      ) : otp ? (
        <form onSubmit={confirm}>
          <p className="mb-3 text-sm text-slate-500">Kod {otp.phone} raqamiga yuborildi (3 daqiqa amal qiladi).</p>
          <Field label="Tasdiqlash kodi">
            <input className="input" inputMode="numeric" pattern="\d{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          {error && <p className="mb-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>Tasdiqlash</button>
        </form>
      ) : (
        <form onSubmit={start}>
          <Field label="Summa (so'm)">
            <input className="input" type="number" min={1000} required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          {price ? (
            <div className="-mt-1 mb-3 flex flex-wrap gap-2">
              {[
                { label: "To'liq narx", value: price },
                { label: '50%', value: Math.round(price / 2) },
              ].map((c) => (
                <button type="button" key={c.label} className="pill pill-idle" onClick={() => setAmount(String(c.value))}>
                  {c.label} ({c.value.toLocaleString('ru-RU')})
                </button>
              ))}
            </div>
          ) : null}
          <div className="mb-3 flex gap-2">
            {(['KYN', 'CARD'] as const).map((m) => (
              <button type="button" key={m} onClick={() => setMethod(m)} className={`pill flex-1 ${method === m ? 'pill-active' : 'pill-idle'}`}>
                {m === 'KYN' ? 'KYN (onlayn)' : 'Karta'}
              </button>
            ))}
          </div>
          {method === 'CARD' && (
            <>
              <Field label="Karta oxirgi 4 raqami"><input className="input" pattern="\d{4}" maxLength={4} required value={cardLast4} onChange={(e) => setLast4(e.target.value)} /></Field>
              <Field label="Amal qilish muddati (MM/YY)"><input className="input" pattern="(0[1-9]|1[0-2])/\d{2}" placeholder="12/28" required value={cardExpiry} onChange={(e) => setExpiry(e.target.value)} /></Field>
              <Field label="Telefon"><input className="input" placeholder="+998901234567" required value={phoneNumber} onChange={(e) => setPhone(e.target.value)} /></Field>
            </>
          )}
          {error && <p className="mb-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>{t('pay')}</button>
        </form>
      )}
    </Modal>
  );
}
