import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../../users/users.service';
import { ProductsService } from '../../../products/products.service';
import { Role } from '../../../users/enums/role.enum';
import { ItemType } from '../../../products/enums/item-type.enum';
import { CreateCatalogItemDto } from '../../../products/dto/create-catalog-item.dto';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly productsService: ProductsService,
        private readonly configService: ConfigService,
    ) { }

    async onApplicationBootstrap() {
        // Centralized environment access via ConfigService
        if (this.configService.get<string>('ENABLE_DB_SEED') !== 'true') return;

        this.logger.log('🌱 Starting enterprise database seeding...');
        await this.seedUsers();
        await this.seedCatalog();
        this.logger.log('✅ Database seeding completed.');
    }

    private async seedUsers() {
        const usersToSeed = [
            { email: 'admin@teste.com', password: 'teste123', role: Role.ADMIN },
            { email: 'staff@teste.com', password: 'teste123', role: Role.STAFF },
            { email: 'custumer@teste.com', password: 'teste123', role: Role.CUSTOMER },
        ];

        for (const { email, password, role } of usersToSeed) {
            const exists = await this.usersService.findByEmail(email);

            if (!exists) {
                // Leverages the existing hashing logic within the service
                const newUser = await this.usersService.create(email, password);

                // The default business rule creates users as CUSTOMER. Promote if a different role is required.
                if (role !== Role.CUSTOMER) {
                    await this.usersService.updateRole(newUser.id, role);
                }

                this.logger.log(`User provisioned: ${email} [${role}]`);
            }
        }
    }

    private async seedCatalog() {
        // Using mocked DTOs with Type Assertion to match the Factory requirements
        const catalogToSeed = [
            {
                type: ItemType.PHYSICAL_GOODS,
                name: 'Enterprise Server Rack Rackmount 42U',
                description: 'High-density heavy-duty server cabinet configured for datacenter scaling.',
                price: 2499.99,
                stockQuantity: 15,
            },
            {
                type: ItemType.SERVICE,
                name: 'Cloud Infrastructure Architecture Consulting',
                description: 'On-site elite engineering support for high-availability deployments.',
                price: 180.00,
                estimatedDurationHours: 120,
            },
        ] as CreateCatalogItemDto[];

        for (const dto of catalogToSeed) {
            const exists = await this.productsService.existsByName(dto.name);
            if (!exists) {
                await this.productsService.create(dto);
                this.logger.log(`Catalog item provisioned: ${dto.name} [${dto.type}]`);
            }
        }
    }
}