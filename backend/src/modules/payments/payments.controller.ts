import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { ADMIN_ROLES, AuthUser, FULL_ADMIN_ROLES } from '../../common/guard/auth-user';
import { CurrentUser, Roles } from '../../common/guard/decorator.roles';
import { AuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Paging, PagingParams } from '../../common/utils/pagination';
import { ConfirmCardOtpDto, CreatePaymentDto, WebhookDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('create')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.STUDENT, ...FULL_ADMIN_ROLES)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthUser) {
    return this.payments.create(dto, user);
  }

  @Post('confirm-card-otp')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.STUDENT, ...FULL_ADMIN_ROLES)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  confirm(@Body() dto: ConfirmCardOtpDto, @CurrentUser() user: AuthUser) {
    return this.payments.confirmCardOtp(dto, user);
  }

  /** Ochiq endpoint — HMAC imzo bilan himoyalangan. */
  @Post('webhook')
  @HttpCode(200)
  webhook(@Body() dto: WebhookDto) {
    return this.payments.handleWebhook(dto);
  }

  @Get('status/:transactionId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  status(@Param('transactionId') transactionId: string, @CurrentUser() user: AuthUser) {
    return this.payments.status(transactionId, user);
  }

  @Get('my-payments')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  myPayments(@CurrentUser() user: AuthUser, @PagingParams() paging: Paging) {
    return this.payments.myPayments(user, paging);
  }

  @Get('admin-notifications')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  adminNotifications() {
    return this.payments.adminNotifications();
  }

  @Get('stats/:studentGroupId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.STUDENT, ...ADMIN_ROLES)
  stats(@Param('studentGroupId', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.payments.stats(id, user);
  }
}
