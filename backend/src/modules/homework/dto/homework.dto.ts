import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateHomeworkDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  lessonId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  groupId: number;

  @ApiProperty({ example: 'Funksiyalar bo\'yicha mashq' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional({ example: 16, description: 'Bajarish muddati (soat)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationTime?: number;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  file?: unknown;
}

export class UpdateHomeworkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  durationTime?: number;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  file?: unknown;
}
