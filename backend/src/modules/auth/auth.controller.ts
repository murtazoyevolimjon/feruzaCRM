import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '../../common/guard/auth-user';
import { CurrentUser } from '../../common/guard/decorator.roles';
import { AuthGuard } from '../../common/guard/jwt-auth.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto } from './dto/login.dto';

// Login urinishlari: daqiqada 5 tadan ko'p emas
const LOGIN_LIMIT = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle(LOGIN_LIMIT)
  @ApiOperation({ summary: 'Umumiy login: admin, o\'qituvchi yoki talaba rolini o\'zi aniqlaydi' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('login/admin')
  @HttpCode(200)
  @Throttle(LOGIN_LIMIT)
  @ApiOperation({ summary: 'Admin / xodim login (User jadvali)' })
  loginAdmin(@Body() dto: LoginDto) {
    return this.auth.loginAdmin(dto);
  }

  @Post('login/teacher')
  @HttpCode(200)
  @Throttle(LOGIN_LIMIT)
  @ApiOperation({ summary: "O'qituvchi login" })
  loginTeacher(@Body() dto: LoginDto) {
    return this.auth.loginTeacher(dto);
  }

  @Post('login/student')
  @HttpCode(200)
  @Throttle(LOGIN_LIMIT)
  @ApiOperation({ summary: 'Talaba login' })
  loginStudent(@Body() dto: LoginDto) {
    return this.auth.loginStudent(dto);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Joriy foydalanuvchi parolini o'zgartirish (istalgan rol)" })
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user, dto);
  }
}
