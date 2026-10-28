import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { NormalizeEmail } from '../../../common/utils/transformers';

export const STAFF_ROLES: Role[] = [
  Role.SUPERADMIN,
  Role.ADMIN,
  Role.MANAGEMENT,
  Role.ADMINSTRATOR,
];

export class CreateUserDto {
  @ApiProperty({ example: 'Aziz Karimov' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'aziz@example.com' })
  @NormalizeEmail()
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;

  @ApiProperty({ example: 'Secret123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: "Parol kamida 8 belgidan iborat bo'lishi kerak" })
  password: string;

  @ApiProperty({ enum: STAFF_ROLES, example: Role.MANAGEMENT })
  @IsIn(STAFF_ROLES, { message: "Xodim roli noto'g'ri" })
  role: Role;

  @ApiPropertyOptional({ example: 'Menejer' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  hire_date?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
