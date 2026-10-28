import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Status } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: '101-xona' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 15 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class UpdateRoomDto extends PartialType(CreateRoomDto) {}
