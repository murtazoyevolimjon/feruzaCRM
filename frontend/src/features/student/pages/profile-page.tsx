import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/endpoints';
import { Field } from '@/components/ui/common';
import { authStore } from '@/features/auth/store/auth.store';
import { errorMessage } from '@/lib/utils';

/** Barcha rollar uchun profil + parolni o'zgartirish (POST /auth/change-password). */
export default function ProfilePage() {
  const { t } = useTranslation();
  const user = authStore.getUser();
  const [oldPassword, setOld] = useState('');
  const [password, setNew] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authApi.changePassword(oldPassword, password);
      setMsg({ ok: true, text: "Parol o'zgartirildi" });
      setOld('');
      setNew('');
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="glass-panel p-5">
        <p className="text-xl font-semibold">{user?.fullName}</p>
        <p className="text-sm text-slate-500">{user?.email} · {user?.role}</p>
        {user?.mustChangePassword && (
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-700">Xavfsizlik uchun parolingizni almashtiring.</p>
        )}
      </div>
      <form onSubmit={submit} className="glass-panel p-5">
        <h2 className="mb-3 font-semibold">{t('changePassword')}</h2>
        <Field label={t('oldPassword')}><input className="input" type="password" required value={oldPassword} onChange={(e) => setOld(e.target.value)} /></Field>
        <Field label={t('newPassword')}><input className="input" type="password" required minLength={8} value={password} onChange={(e) => setNew(e.target.value)} /></Field>
        {msg && <p className={`mb-3 rounded-lg p-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{msg.text}</p>}
        <button className="btn btn-primary">{t('save')}</button>
      </form>
    </div>
  );
}
