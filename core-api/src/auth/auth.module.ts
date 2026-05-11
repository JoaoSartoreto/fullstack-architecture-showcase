import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { AuthJwtModule } from 'src/auth/jwt/auth-jwt.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { globalJwtGuardProvider } from './providers/jwt-guard.provider';
import { globalRolesGuardProvider } from './providers/roles-guard.provider';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    AuthJwtModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    globalJwtGuardProvider,
    globalRolesGuardProvider,
  ],
  controllers: [AuthController]
})
export class AuthModule { }
