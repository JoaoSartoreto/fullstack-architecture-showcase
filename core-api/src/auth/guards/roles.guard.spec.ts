import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../common/enums/role.enum';

describe('RolesGuard', () => {
    let guard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
        reflector = new Reflector();
        guard = new RolesGuard(reflector);
    });

    // Função auxiliar para "fingir" (mock) uma requisição HTTP do NestJS
    const mockExecutionContext = (userRole: Role): ExecutionContext => {
        return {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                    user: { role: userRole },
                }),
            }),
        } as unknown as ExecutionContext;
    };

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should allow access if no roles are required', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
        const context = mockExecutionContext(Role.CUSTOMER);

        expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow an ADMIN to access a STAFF route', () => {
        // Simulamos que a rota exige ['STAFF']
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.STAFF]);

        // O usuário acessando é um ADMIN
        const context = mockExecutionContext(Role.ADMIN);

        expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny a CUSTOMER from accessing a STAFF route', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.STAFF]);
        const context = mockExecutionContext(Role.CUSTOMER);

        expect(guard.canActivate(context)).toBe(false);
    });

    it('should allow a CUSTOMER to access a CUSTOMER route', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.CUSTOMER]);
        const context = mockExecutionContext(Role.CUSTOMER);

        expect(guard.canActivate(context)).toBe(true);
    });
});