import type { Role } from '@/lib/constants';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  fullName: string;
  avatar?: string | null;
  mustChangePassword?: boolean;
}

const safe = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const authStore = {
  getToken: () => safe.get('accessToken'),

  getUser(): AuthUser | null {
    const raw = safe.get('user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  /** Rol har doim UPPERCASE; `role` yo'q bo'lsa `user.role` dan olinadi. */
  getResolvedRole(): Role | null {
    const stored = safe.get('role') ?? authStore.getUser()?.role;
    return stored ? (String(stored).toUpperCase() as Role) : null;
  },

  login(token: string, user: AuthUser) {
    const role = String(user.role).toUpperCase() as Role;
    safe.set('accessToken', token);
    safe.set('user', JSON.stringify({ ...user, role }));
    safe.set('role', role);
  },

  clear() {
    ['accessToken', 'user', 'role'].forEach(safe.remove);
  },
};
