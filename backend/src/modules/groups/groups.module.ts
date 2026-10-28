import { Module } from '@nestjs/common';
import { GroupsController, StudentGroupController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  controllers: [GroupsController, StudentGroupController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
