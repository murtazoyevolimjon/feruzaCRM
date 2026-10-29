import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, TrendingUp, Users, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/endpoints';
import { BRAND_NAME, homePathFor } from '@/lib/constants';
import { errorMessage } from '@/lib/utils';
import { authStore } from '../store/auth.store';

const FEATURES = [
  { icon: Users, title: 'Guruhlar va o\'quvchilar', text: 'Barcha guruh, o\'qituvchi va o\'quvchilar bir joyda' },
  { icon: ClipboardCheck, title: 'Tezkor davomat', text: 'Bir bosishda davomat va uyga vazifa nazorati' },
  { icon: Wallet, title: 'Moliya va qarzdorlik', text: 'Kirim, chiqim va qarzdorlar avtomatik hisoblanadi' },
];

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Rol (admin / o'qituvchi / talaba) serverda avtomatik aniqlanadi
      const res = await authApi.login(email.trim().toLowerCase(), password.trim());
      authStore.login(res.accessToken, res.user);
      navigate(homePathFor(authStore.getResolvedRole()), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setShake((n) => n + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* ---------- Chap: brend paneli ---------- */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 animate-blob rounded-full bg-indigo-400/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-[28rem] w-[28rem] animate-blob rounded-full bg-fuchsia-500/30 blur-3xl [animation-delay:-5s]" />
        <div className="pointer-events-none absolute left-1/3 top-1/2 h-72 w-72 animate-blob rounded-full bg-sky-400/20 blur-3xl [animation-delay:-10s]" />
        <div className="pointer-events-none absolute inset-0 opacity-[.07]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '26px 26px' }} />

        <div className="relative flex animate-slide-in items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-lg font-extrabold shadow-lg ring-1 ring-white/30 backdrop-blur">M</span>
          <span className="text-xl font-extrabold tracking-wide">{BRAND_NAME}</span>
        </div>

        <div className="relative max-w-xl">
          <h1 className="animate-fade-up text-[44px] font-extrabold leading-[1.1] tracking-tight !text-white">
            O'quv markazingizni <span className="bg-gradient-to-r from-amber-200 to-pink-200 bg-clip-text text-transparent">bitta joydan</span> boshqaring
          </h1>
          <p className="mt-4 max-w-md animate-fade-up text-[15px] text-indigo-100/90 [animation-delay:120ms]">
            Guruhlar, davomat, uyga vazifa va to'lovlar, barchasi tez, qulay va tartibli.
          </p>

          <ul className="stagger mt-9 space-y-3.5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur transition-all duration-300 hover:translate-x-1.5 hover:bg-white/15">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20"><Icon className="h-5 w-5" /></span>
                <div><p className="font-semibold">{title}</p><p className="text-[12px] text-indigo-100/80">{text}</p></div>
              </li>
            ))}
          </ul>
        </div>

        {/* Suzuvchi kartochkalar */}
        <div className="pointer-events-none absolute right-10 top-24 animate-float rounded-2xl bg-white/90 p-4 text-slate-800 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><TrendingUp className="h-5 w-5" /></span>
            <div><p className="text-[11px] text-slate-500">Bugungi tushum</p><p className="text-[15px] font-extrabold">+ 4 200 000 UZS</p></div>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-28 right-16 animate-float-rev rounded-2xl bg-white/90 p-4 text-slate-800 shadow-2xl">
          <p className="text-[11px] text-slate-500">Davomat</p>
          <p className="text-[20px] font-extrabold text-indigo-600">94%</p>
          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[94%] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" /></div>
        </div>

        <p className="relative flex items-center gap-2 text-[12px] text-indigo-100/70"><ShieldCheck className="h-4 w-4" /> Ma'lumotlaringiz himoyalangan</p>
      </aside>

      {/* ---------- O'ng: forma ---------- */}
      <main className="relative flex items-center justify-center overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 animate-blob rounded-full bg-indigo-300/30 blur-3xl lg:hidden" />

        <div className="relative w-full max-w-[400px] animate-fade-up">
          <div className="mb-8 lg:hidden">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-extrabold text-white shadow-glow">M</span>
            <p className="text-lg font-extrabold text-indigo-700">{BRAND_NAME}</p>
          </div>

          <h2 className="text-[30px] font-extrabold tracking-tight">Xush kelibsiz 👋</h2>
          <p className="mb-8 mt-1.5 text-slate-500">Davom etish uchun hisobingizga kiring</p>

          <form key={shake} onSubmit={submit} className={`space-y-4 ${shake ? 'animate-shake' : ''}`}>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">{t('email')}</span>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                <input className="input !py-3 pl-11" type="email" required autoComplete="username" placeholder="email@manzil.uz" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">{t('password')}</span>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                <input className="input !py-3 pl-11 pr-11" type={show ? 'text' : 'password'} required autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label="Parolni ko'rsatish" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                  {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </label>

            {error && (
              <p className="flex animate-scale-in items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" /> {error}
              </p>
            )}

            <button className="btn btn-primary group w-full !rounded-2xl !py-3.5 text-[14px]" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t('login')} <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-[12px] text-slate-400">© {new Date().getFullYear()} {BRAND_NAME}. Barcha huquqlar himoyalangan.</p>
        </div>
      </main>
    </div>
  );
}
