import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AuthRequest } from './auth-user';
import { ROLES_KEY } from './decorator.roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // @Roles ko'rsatilmagan bo'lsa — faqat autentifikatsiya talab qilinadi
    if (!roles || roles.length === 0) return true;

    const user = context.switchToHttp().getRequest<AuthRequest>().user;
    if (!user) throw new UnauthorizedException('Avval tizimga kiring');
    if (!roles.includes(user.role)) {
      throw new ForbiddenException("Bu amal uchun ruxsatingiz yo'q");
    }
    return true;
  }
}
