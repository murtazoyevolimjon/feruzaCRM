import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CourseLevel, Status } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min, MinLength } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'Backend Node.js' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 6, description: 'Davomiyligi (oy)' })
  @IsInt()
  @Min(1)
  durationMonth: number;

  @ApiProperty({ example: 90, description: 'Bitta dars davomiyligi (daqiqa)' })
  @IsInt()
  @Min(10)
  durationLesson: number;

  @ApiProperty({ example: 1200000 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ enum: CourseLevel })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
