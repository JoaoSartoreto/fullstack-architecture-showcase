import { applyDecorators } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../common/pagination/decorators/api-paginated-response.decorator';
import { UserResponseDto } from './dto/user-response.dto';

export function ApiDocsUsersController() {
    return applyDecorators(ApiTags('Users Management'));
}

export function ApiDocsCreateUser() {
    return applyDecorators(
        ApiOperation({ summary: 'Register a new user' }),
        ApiCreatedResponse({ description: 'User successfully created.', type: UserResponseDto }),
        ApiConflictResponse({ description: 'This e-mail is already in use.' })
    );
}

export function ApiDocsGetProfile() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Get current logged-in user profile' }),
        ApiOkResponse({ description: 'Profile retrieved successfully.', type: UserResponseDto })
    );
}

export function ApiDocsUpdateRole() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Promote or demote a user role (Admin only)' }),
        ApiOkResponse({ description: 'User role updated successfully.', type: UserResponseDto }),
        ApiNotFoundResponse({ description: 'User with specified ID not found.' })
    );
}

export function ApiDocsFindAll() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'List all system users (Staff/Admin only)' }),
        ApiPaginatedResponse(UserResponseDto)
    );
}

export function ApiDocsUpdateUser() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Update current user profile data (e.g., password)' }),
        ApiOkResponse({ description: 'Profile updated successfully.', type: UserResponseDto })
    );
}