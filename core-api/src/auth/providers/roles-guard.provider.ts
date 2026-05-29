import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';

export const globalRolesGuardProvider = {
    provide: APP_GUARD,
    useClass: RolesGuard,
};