import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

const logger = new Logger('Prisma');

/** Prisma xatolarini mos HTTP xatolarga o'giradi. Har doim throw qiladi. */
export function handlePrismaError(error: unknown, entity = "Ma'lumot"): never {
  if (error instanceof HttpException) throw error;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new ConflictException(`${entity} allaqachon mavjud`);
      case 'P2025':
        throw new NotFoundException(`${entity} topilmadi`);
      case 'P2003':
        throw new BadRequestException(
          `${entity} bog'liq ma'lumot topilmadi yoki boshqa yozuvlar bilan bog'langan`,
        );
    }
  }

  logger.error(error instanceof Error ? error.stack : String(error));
  throw new InternalServerErrorException('Serverda xatolik yuz berdi');
}
