import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Role } from '../../users/enums/role.enum';

// 1. Role Hierarchy Logic
const ROLE_HIERARCHY: Record<Role, number> = {
    [Role.CUSTOMER]: 1,
    [Role.STAFF]: 2,
    [Role.ADMIN]: 3,
};

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // 2. Extract the required roles from the route's metadata
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no specific roles are required, let the user pass (the JWT Guard already authenticated them)
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        // 3. Extract the authenticated user from the request
        const { user } = context.switchToHttp().getRequest();

        const userLevel = ROLE_HIERARCHY[user.role as Role];

        // Find the lowest required level among all roles passed to the @Roles() decorator
        const minimumRequiredLevel = Math.min(...requiredRoles.map(role => ROLE_HIERARCHY[role]));

        // 4. Grant access if the user's level is greater than or equal to the requirement
        return userLevel >= minimumRequiredLevel;
    }
}