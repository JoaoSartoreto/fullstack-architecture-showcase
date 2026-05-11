import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserEntity } from 'src/users/entities/user.entity';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    // 1. Validates the plain text password against the hashed password in the DB
    async validateUser(email: string, pass: string): Promise<Omit<UserEntity, 'passwordHash'> | null> {
        const user = await this.usersService.findByEmail(email);

        // If the user exists, compare the passwords
        if (user && await bcrypt.compare(pass, user.passwordHash)) {
            // We extract the passwordHash and return the rest of the user object
            const { passwordHash, ...result } = user;
            return result;
        }

        // Returns null if the user doesn't exist or the password doesn't match
        return null;
    }

    // 2. Generates the JWT token for the validated user
    async login(email: string, pass: string) {
        const user = await this.validateUser(email, pass);
         if (!user) throw new UnauthorizedException('Invalid credentials.');

        const payload = { email: user.email, sub: user.id };

        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}