import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../../common/utils/transformers';

export class CreateStudentDto {
  @ApiProperty({ example: 'Madina Aliyeva' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'madina@example.com' })
  @NormalizeEmail()
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;

  @ApiProperty({ example: 'Secret123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: "Parol kamida 8 belgidan iborat bo'lishi kerak" })
  password: string;

  @ApiPropertyOptional({ example: '2008-05-20' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: "Tug'ilgan sana noto'g'ri" })
  birth_date?: Date;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Rasm' })
  photo?: unknown;
}

export class UpdateStudentDto extends PartialType(CreateStudentDto) {}
