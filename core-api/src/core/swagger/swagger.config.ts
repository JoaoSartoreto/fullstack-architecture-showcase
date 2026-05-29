import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Bootstraps the Swagger / OpenAPI configuration for the application.
 * @param app The active NestJS application instance
 */
export function setupSwagger(app: INestApplication): void {
    const config = new DocumentBuilder()
        .setTitle('Enterprise Ecosystem Showcase API')
        .setDescription(
            'A B2B/B2G proof-of-concept API demonstrating DDD, strict RBAC, polymorphic catalogs, and distributed architecture patterns.',
        )
        .setVersion('1.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth', // Internal reference for @ApiBearerAuth() decorators
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api-docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true, // Retains the JWT token upon UI refresh
        },
    });
}