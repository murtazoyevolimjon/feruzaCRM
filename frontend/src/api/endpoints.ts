import { http } from './axios';
import { unwrap } from '@/lib/utils';

/** GET va javobni `data?.data ?? data` bilan ochadi. */
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await http.get(url, { params });
  return unwrap<T>(res.data);
}

export async function send<T = unknown>(
  method: 'post' | 'put' | 'patch' | 'delete',
  url: string,
  body?: unknown,
): Promise<T> {
  const res = await http.request({
    method,
    url,
    data: body,
    // FormData bo'lsa axios multipart sarlavhasini o'zi qo'yadi
  });
  return res.data as T;
}

/** Obyektni FormData ga o'giradi (fayl maydonlari bilan). */
export function toFormData(values: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue;
    if (value instanceof File) fd.append(key, value);
    else if (Array.isArray(value)) value.forEach((v) => fd.append(key, String(v)));
    else fd.append(key, String(value));
  }
  return fd;
}

export const authApi = {
  /** Rolni server o'zi aniqlaydi (admin / o'qituvchi / talaba). */
  login: async (email: string, password: string) =>
    (await http.post('/auth/login', { email, password })).data as {
      accessToken: string;
      user: import('@/features/auth/store/auth.store').AuthUser;
    },
  changePassword: (oldPassword: string, password: string) =>
    send('post', '/auth/change-password', { oldPassword, password }),
};
