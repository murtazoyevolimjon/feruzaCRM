import { Navigate, Outlet } from 'react-router-dom';
import { authStore } from '@/features/auth/store/auth.store';
import { homePathFor, type Role } from '@/lib/constants';

export function RoleLandingRedirect() {
  const token = authStore.getToken();
  const role = authStore.getResolvedRole();
  return <Navigate to={token ? homePathFor(role) : '/login'} replace />;
}

export function GuestOnlyRoute() {
  const token = authStore.getToken();
  const role = authStore.getResolvedRole();
  if (token && role) return <Navigate to={homePathFor(role)} replace />;
  return <Outlet />;
}

export function ProtectedRoute({ roles }: { roles: Role[] }) {
  const token = authStore.getToken();
  const role = authStore.getResolvedRole();
  if (!token || !role) return <Navigate to="/login" replace />;
  // Ruxsat etilmagan bo'limga kirilsa — o'z bosh sahifasiga
  if (!roles.includes(role)) return <Navigate to={homePathFor(role)} replace />;
  return <Outlet />;
}
