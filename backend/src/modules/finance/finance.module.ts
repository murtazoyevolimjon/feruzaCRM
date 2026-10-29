import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaymentStatus, Status, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { ADMIN_ROLES, AuthUser, FULL_ADMIN_ROLES } from '../../common/guard/auth-user';
import { CurrentUser, Roles } from '../../common/guard/decorator.roles';
import { AuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Paging, PagingParams, pageArgs, pageMeta } from '../../common/utils/pagination';
import { DebtResult, computeDebt } from './debt.util';

interface DebtorRow extends DebtResult {
  studentGroupId: number;
  studentId: number;
  fullName: string;
  email: string;
  groupName: string;
  courseName: string;
  monthlyPrice: number;
}

export class CreateExpenseDto {
  @ApiProperty({ example: 'Ofis ijarasi' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ example: 'Ijara', description: 'Ijara, Maosh, Kommunal, Marketing, Jihozlar, Boshqa' })
  @IsString()
  @MinLength(2)
  category: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: '2026-10-28', description: 'Berilmasa — bugun' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

/** 'YYYY-MM' -> [boshlanish, keyingi oy boshi). Berilmasa — joriy oy. */
export function monthRange(month?: string, now = new Date()): { start: Date; end: Date } {
  let year = now.getFullYear();
  let m = now.getMonth();
  if (month) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!match) throw new BadRequestException("Oy formati YYYY-MM bo'lishi kerak");
    year = Number(match[1]);
    m = Number(match[2]) - 1;
  }
  return { start: new Date(year, m, 1), end: new Date(year, m + 1, 1) };
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(month?: string) {
    const { start, end } = monthRange(month);
    const paidInRange = { status: PaymentStatus.COMPLETED, paidAt: { gte: start, lt: end } };

    const [income, byMethod, expense, byCategory, debtors] = await Promise.all([
      this.prisma.payment.aggregate({ where: paidInRange, _sum: { amount: true } }),
      this.prisma.payment.groupBy({ by: ['paymentMethod'], where: paidInRange, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { amount: true } }),
      this.prisma.expense.groupBy({ by: ['category'], where: { date: { gte: start, lt: end } }, _sum: { amount: true } }),
      this.computeDebtors(),
    ]);

    const incomeTotal = Number(income._sum.amount ?? 0);
    const expenseTotal = Number(expense._sum.amount ?? 0);
    return {
      success: true,
      data: {
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        income: incomeTotal,
        expense: expenseTotal,
        profit: incomeTotal - expenseTotal,
        incomeByMethod: Object.fromEntries(byMethod.map((r) => [r.paymentMethod, Number(r._sum.amount ?? 0)])),
        expenseByCategory: Object.fromEntries(byCategory.map((r) => [r.category, Number(r._sum.amount ?? 0)])),
        debtTotal: debtors.reduce((s, d) => s + d.debt, 0),
        debtorCount: new Set(debtors.map((d) => d.studentId)).size,
      },
    };
  }

  async payments(month?: string, paging: Paging = {}) {
    const { start, end } = monthRange(month);
    const args = pageArgs(paging);
    const where = { status: PaymentStatus.COMPLETED, paidAt: { gte: start, lt: end } };
    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { paidAt: 'desc' },
        include: {
          student: { select: { fullName: true } },
          studentGroup: { include: { group: { select: { name: true } } } },
        },
        skip: args.skip,
        take: args.take,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      meta: pageMeta(total, args),
      success: true,
      data: rows.map((p) => ({
        id: p.id,
        paidAt: p.paidAt,
        amount: Number(p.amount),
        studentName: p.student.fullName,
        groupName: p.studentGroup.group.name,
        paymentMethod: p.paymentMethod,
        invoiceNumber: p.invoiceNumber,
      })),
    };
  }

  async expenses(month?: string, paging: Paging = {}) {
    const { start, end } = monthRange(month);
    const args = pageArgs(paging);
    const where = { date: { gte: start, lt: end } };
    const [rows, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        include: { user: { select: { fullName: true } } },
        skip: args.skip,
        take: args.take,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return {
      success: true,
      meta: pageMeta(total, args),
      data: rows.map(({ user, ...e }) => ({ ...e, amount: Number(e.amount), createdBy: user.fullName })),
    };
  }

  async createExpense(dto: CreateExpenseDto, user: AuthUser) {
    const e = await this.prisma.expense.create({
      data: { ...dto, userId: user.id },
    });
    return { success: true, message: "Chiqim qo'shildi", data: { ...e, amount: Number(e.amount) } };
  }

  async removeExpense(id: number) {
    const exists = await this.prisma.expense.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Chiqim topilmadi');
    await this.prisma.expense.delete({ where: { id } });
    return { success: true, message: "Chiqim o'chirildi" };
  }

  async debtors() {
    const all = await this.computeDebtors();
    return { success: true, data: all.sort((a, b) => b.debt - a.debt) };
  }

  /**
   * Bir vaqtda kelgan so'rovlar (summary + debtors) bitta hisobni bo'lishadi.
   * Natija keshlanmaydi: hisob tugashi bilan unutiladi, shuning uchun to'lovdan keyin eskirgan ma'lumot chiqmaydi.
   */
  private debtorsInFlight?: Promise<DebtorRow[]>;

  private computeDebtors(): Promise<DebtorRow[]> {
    this.debtorsInFlight ??= this.loadDebtors().finally(() => {
      this.debtorsInFlight = undefined;
    });
    return this.debtorsInFlight;
  }

  /** 2 ta so'rov: faol a'zoliklar + to'lovlar yig'indisi (to'lov qatorlari yuklanmaydi, N+1 yo'q). */
  private async loadDebtors(): Promise<DebtorRow[]> {
    const now = new Date();
    const memberships = await this.prisma.studentGroup.findMany({
      where: {
        status: Status.ACTIVE,
        student: { status: UserStatus.ACTIVE },
        group: { status: Status.ACTIVE },
      },
      select: {
        id: true,
        created_at: true,
        student: { select: { id: true, fullName: true, email: true } },
        group: { select: { name: true, startDate: true, course: { select: { name: true, price: true, durationMonth: true } } } },
      },
    });

    // To'lovlar bazada yig'iladi: a'zolik bo'yicha bitta qator
    const paidRows = await this.prisma.payment.groupBy({
      by: ['studentGroupId'],
      where: { status: PaymentStatus.COMPLETED, studentGroup: { status: Status.ACTIVE } },
      _sum: { amount: true },
    });
    const paidBy = new Map(paidRows.map((r) => [r.studentGroupId, Number(r._sum.amount ?? 0)]));

    return memberships
      .map((m) => {
        const from = m.group.startDate > m.created_at ? m.group.startDate : m.created_at;
        const r = computeDebt({
          price: Number(m.group.course.price),
          durationMonth: m.group.course.durationMonth,
          from,
          now,
          paid: paidBy.get(m.id) ?? 0,
        });
        return {
          studentGroupId: m.id,
          studentId: m.student.id,
          fullName: m.student.fullName,
          email: m.student.email,
          groupName: m.group.name,
          courseName: m.group.course.name,
          monthlyPrice: Number(m.group.course.price),
          ...r,
        };
      })
      .filter((d) => d.debt > 0);
  }
}

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('summary')
  @ApiQuery({ name: 'month', required: false, example: '2026-10' })
  summary(@Query('month') month?: string) {
    return this.finance.summary(month);
  }

  @Get('payments')
  @ApiQuery({ name: 'month', required: false, example: '2026-10' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  payments(@Query('month') month: string | undefined, @PagingParams() paging: Paging) {
    return this.finance.payments(month, paging);
  }

  @Get('expenses')
  @ApiQuery({ name: 'month', required: false, example: '2026-10' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  expenses(@Query('month') month: string | undefined, @PagingParams() paging: Paging) {
    return this.finance.expenses(month, paging);
  }

  @Post('expenses')
  @Roles(...FULL_ADMIN_ROLES)
  createExpense(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUser) {
    return this.finance.createExpense(dto, user);
  }

  @Delete('expenses/:id')
  @Roles(...FULL_ADMIN_ROLES)
  removeExpense(@Param('id', ParseIntPipe) id: number) {
    return this.finance.removeExpense(id);
  }

  @Get('debtors')
  debtors() {
    return this.finance.debtors();
  }
}

@Module({
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
