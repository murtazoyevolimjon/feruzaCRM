import { Role } from '@prisma/client';
import { Request } from 'express';

/** JWT payload. */
export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user: AuthUser;
}

/** Admin paneliga kira oladigan rollar. */
export const ADMIN_ROLES: Role[] = [
  Role.SUPERADMIN,
  Role.ADMIN,
  Role.ADMINSTRATOR,
  Role.MANAGEMENT,
];

/** To'liq yozish huquqiga ega rollar. */
export const FULL_ADMIN_ROLES: Role[] = [Role.SUPERADMIN, Role.ADMIN];
