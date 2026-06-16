import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { RequestContext } from '../../core/context/request-context';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            // Extracts the token from the 'Authorization: Bearer <TOKEN>' header
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET')!,
        });
    }

    // This method is called after the token is verified. 
    // What we return here is injected into 'req.user'
    async validate(payload: any) {
        const store = RequestContext.getStore();
        if (store) store.actorId = payload.sub;

        const user = await this.usersService.findById(payload.sub);
        if (!user) throw new UnauthorizedException('User no longer exists.');

        return user;
    }
}