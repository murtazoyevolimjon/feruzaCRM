import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { NormalizeEmail, Trim } from '../../../common/utils/transformers';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @NormalizeEmail()
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;

  @ApiProperty({ example: 'Secret123' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: "Parol bo'sh bo'lmasligi kerak" })
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass123' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ example: 'NewPass123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: "Yangi parol kamida 8 belgidan iborat bo'lishi kerak" })
  password: string;
}
