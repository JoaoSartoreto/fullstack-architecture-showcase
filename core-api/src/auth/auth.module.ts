import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { AuthJwtModule } from '../auth/jwt/auth-jwt.module';
import { JwtStrategy } from './strategies/jwt.strategy';
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
