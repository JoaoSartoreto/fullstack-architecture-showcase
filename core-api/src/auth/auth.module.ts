import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthJwtModule } from '../auth/jwt/auth-jwt.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { globalJwtGuardProvider } from './providers/jwt-guard.provider';
import { globalRolesGuardProvider } from './providers/roles-guard.provider';
import { JwtStrategy } from './strategies/jwt.strategy';

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
