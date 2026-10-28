import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 500000, minimum: 1000 })
  @IsNumber()
  @Min(1000, { message: "Summa kamida 1000 so'm bo'lishi kerak" })
  amount: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  studentGroupId: number;

  @ApiPropertyOptional({ description: 'Admin yaratganda majburiy; talaba uchun e\'tiborga olinmaydi' })
  @IsOptional()
  @IsInt()
  studentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.KYN })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: '4242', description: 'Karta oxirgi 4 raqami' })
  @IsOptional()
  @Matches(/^\d{4}$/, { message: "Karta oxirgi 4 raqami noto'g'ri" })
  cardLast4?: string;

  @ApiPropertyOptional({ example: '12/28' })
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Muddat MM/YY formatida bo\'lishi kerak' })
  cardExpiry?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @Matches(/^\+?\d{9,15}$/, { message: "Telefon raqami noto'g'ri" })
  phoneNumber?: string;
}

export class ConfirmCardOtpDto {
  @ApiProperty()
  @IsString()
  otpSessionId: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'Kod 6 xonali bo\'lishi kerak' })
  code: string;
}

export class WebhookDto {
  @IsString() transactionId: string;
  @IsString() orderId: string;
  @IsOptional() amount: string | number;
  @IsString() status: string;
  @IsOptional() @IsString() signature?: string;
  @IsOptional() @IsString() responseCode?: string;
  @IsOptional() @IsString() responseMessage?: string;
}
