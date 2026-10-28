import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/endpoints';
import { APP_NAME, BRAND_NAME, homePathFor } from '@/lib/constants';
import { errorMessage } from '@/lib/utils';
import { authStore } from '../store/auth.store';

type Kind = 'admin' | 'teacher' | 'student';
const KINDS: Array<{ kind: Kind; label: string }> = [
  { kind: 'admin', label: 'Admin' },
  { kind: 'teacher', label: "O'qituvchi" },
  { kind: 'student', label: 'Talaba' },
];

export default function LoginPage({ initialKind = 'admin' }: { initialKind?: Kind }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(kind, email.trim().toLowerCase(), password.trim());
      authStore.login(res.accessToken, res.user);
      navigate(homePathFor(authStore.getResolvedRole()), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="glass-panel w-full max-w-sm space-y-4 p-8">
        <div className="text-center">
          <h1 className="brand-gradient-text text-3xl font-bold">{BRAND_NAME}</h1>
          <p className="text-sm text-slate-500">{APP_NAME}</p>
        </div>
        <div className="flex gap-2">
          {KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              onClick={() => setKind(k.kind)}
              className={`pill flex-1 ${kind === k.kind ? 'pill-active' : 'pill-idle'}`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <input className="input" type="email" required placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" required placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading}>{t('login')}</button>
      </form>
    </div>
  );
}
