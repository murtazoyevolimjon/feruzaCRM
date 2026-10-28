import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

const ctx = (req: object, roles?: Role[]) =>
  ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
    __roles: roles,
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  const jwt = { verifyAsync: jest.fn() };
  const guard = new AuthGuard(jwt as never);

  it('header yo\'q bo\'lsa 401', async () => {
    await expect(guard.canActivate(ctx({ headers: {} }))).rejects.toThrow(UnauthorizedException);
  });

  it("token yaroqli bo'lsa req.user to'ldiriladi", async () => {
    jwt.verifyAsync.mockResolvedValue({ id: 1, email: 'a@b.c', role: Role.ADMIN });
    const req: { headers: Record<string, string>; user?: unknown } = {
      headers: { authorization: 'Bearer token' },
    };
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.user).toMatchObject({ id: 1 });
  });
});

describe('RolesGuard', () => {
  const make = (roles?: Role[]) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(roles) } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('@Roles yo\'q bo\'lsa o\'tkazadi (yiqilmaydi)', () => {
    expect(make(undefined).canActivate(ctx({ user: { role: Role.STUDENT } }))).toBe(true);
  });

  it("ruxsat etilmagan rolga 403", () => {
    expect(() => make([Role.ADMIN]).canActivate(ctx({ user: { role: Role.STUDENT } }))).toThrow(
      ForbiddenException,
    );
  });

  it('ruxsat etilgan rolni o\'tkazadi', () => {
    expect(make([Role.ADMIN]).canActivate(ctx({ user: { role: Role.ADMIN } }))).toBe(true);
  });
});
