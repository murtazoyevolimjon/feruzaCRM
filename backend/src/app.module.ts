import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import { validateEnv } from './common/config/env.validation';
import { EmailModule } from './common/email/email.module';
import { GuardModule } from './common/guard/guard.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { UserSeeder } from './common/seed/user.seed';
import { SmsModule } from './common/sms/sms.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { CourseModule } from './modules/course/course.module';
import { GroupsModule } from './modules/groups/groups.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { HomeworkResponseModule } from './modules/homework/homework-response/homework-response.module';
import { HomeworkResultsModule } from './modules/homework/homework-results/homework-results.module';
import { LessonVideosModule } from './modules/lesson-videos/lesson-videos.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    GuardModule,
    CloudinaryModule,
    EmailModule,
    SmsModule,
    RedisModule,
    AuthModule,
    UsersModule,
    TeachersModule,
    StudentsModule,
    CourseModule,
    RoomsModule,
    GroupsModule,
    LessonsModule,
    AttendanceModule,
    HomeworkModule,
    HomeworkResponseModule,
    HomeworkResultsModule,
    LessonVideosModule,
    PaymentsModule,
  ],
  providers: [UserSeeder, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
