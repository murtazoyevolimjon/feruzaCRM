import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 500;

export interface Paging {
  page?: number;
  limit?: number;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const toInt = (value: unknown): number | undefined => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : undefined;
};

/** `?page=2&limit=50` ni o'qiydi (noto'g'ri qiymat e'tiborsiz qoladi). */
export const PagingParams = createParamDecorator((_data: unknown, ctx: ExecutionContext): Paging => {
  const query = ctx.switchToHttp().getRequest<{ query?: Record<string, unknown> }>().query ?? {};
  return { page: toInt(query.page), limit: toInt(query.limit) };
});

/** Prisma `skip/take` va javobdagi `meta` uchun xavfsiz qiymatlar (limit MAX_LIMIT dan oshmaydi). */
export function pageArgs(paging: Paging = {}, defaultLimit = DEFAULT_LIMIT) {
  const limit = Math.min(Math.max(paging.limit ?? defaultLimit, 1), MAX_LIMIT);
  const page = Math.max(paging.page ?? 1, 1);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function pageMeta(total: number, args: { page: number; limit: number }): PageMeta {
  return { total, page: args.page, limit: args.limit, pages: Math.max(Math.ceil(total / args.limit), 1) };
}
