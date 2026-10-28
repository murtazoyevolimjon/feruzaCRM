import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Status, WeekDays } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'NODE-24' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  teacherId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  roomId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  courseId: number;

  @ApiProperty({ example: '2026-09-01' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ example: '14:00', description: 'HH:mm' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Vaqt HH:mm formatida bo\'lishi kerak' })
  startTime: string;

  @ApiProperty({ enum: WeekDays, isArray: true, example: [WeekDays.MONDAY, WeekDays.WEDNESDAY] })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WeekDays, { each: true })
  weekDays: WeekDays[];
}

export class UpdateGroupDto extends PartialType(CreateGroupDto) {
  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class AddStudentToGroupDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  groupId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  studentId: number;
}
