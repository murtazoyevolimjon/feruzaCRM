import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Status } from '@prisma/client';
import { handlePrismaError } from '../../common/prisma/prisma-error.helper';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const data = await this.prisma.room.findMany({ orderBy: { created_at: 'desc' } });
    return { success: true, data };
  }

  async create(dto: CreateRoomDto) {
    try {
      const data = await this.prisma.room.create({ data: dto });
      return { success: true, message: 'Xona yaratildi', data };
    } catch (error) {
      handlePrismaError(error, 'Bu nomli xona');
    }
  }

  async update(id: number, dto: UpdateRoomDto) {
    try {
      const data = await this.prisma.room.update({ where: { id }, data: dto });
      return { success: true, message: 'Xona yangilandi', data };
    } catch (error) {
      handlePrismaError(error, 'Xona');
    }
  }

  /** Soft delete: faol guruhi bor xonani o'chirib bo'lmaydi. */
  async remove(id: number) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Xona topilmadi');
    const activeGroups = await this.prisma.group.count({
      where: { roomId: id, status: Status.ACTIVE },
    });
    if (activeGroups > 0) {
      throw new ConflictException(`Xonada ${activeGroups} ta faol guruh bor`);
    }
    await this.prisma.room.update({ where: { id }, data: { status: Status.INACTIVE } });
    return { success: true, message: "Xona o'chirildi" };
  }
}
