/** API ba'zan `{ data: [...] }`, ba'zan to'g'ridan-to'g'ri massiv qaytaradi. */
export function unwrap<T>(body: unknown): T {
  const b = body as { data?: T } | T;
  return ((b as { data?: T })?.data ?? b) as T;
}

export function errorMessage(error: unknown, fallback = 'Xatolik yuz berdi'): string {
  const e = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const msg = e?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? e?.message ?? fallback;
}

/** 1 200 000 UZS */
export function formatMoney(value: number | string): string {
  return `${Number(value).toLocaleString('ru-RU')} UZS`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** DD.MM.YYYY */
export function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
