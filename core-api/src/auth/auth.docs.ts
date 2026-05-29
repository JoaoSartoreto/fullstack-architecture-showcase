import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiTags } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login-response.dto';

export function ApiDocsLogin() {
    return applyDecorators(
        ApiOperation({ summary: 'Authenticate user and generate JWT token' }),
        ApiOkResponse({
            description: 'Login successful. Returns the JWT access token.',
            type: LoginResponseDto
        }),
        ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
    );
}

// Optional: A decorator to tag the whole controller in the Swagger UI
export function ApiDocsAuthController() {
    return applyDecorators(ApiTags('Authentication'));
}