import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ApiDocsAuthController, ApiDocsLogin } from './auth.docs';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiDocsAuthController()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiDocsLogin()
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }
}