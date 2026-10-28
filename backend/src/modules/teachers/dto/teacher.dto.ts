import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../../common/utils/transformers';

export class CreateTeacherDto {
  @ApiProperty({ example: 'Dilshod Rahimov' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'dilshod@example.com' })
  @NormalizeEmail()
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;

  @ApiProperty({ example: 'Secret123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: "Parol kamida 8 belgidan iborat bo'lishi kerak" })
  password: string;

  @ApiPropertyOptional({ example: 'Backend developer' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ example: 3, description: 'Tajriba (yil)' })
  @IsInt()
  @Min(0)
  experience: number;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Rasm' })
  photo?: unknown;
}

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {}

export class ResetOwnPasswordDto {
  @ApiProperty()
  @IsString()
  oldPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: "Yangi parol kamida 8 belgidan iborat bo'lishi kerak" })
  password: string;
}
