import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';

// Exports the provider object to keep the AppModule clean
export const validationProvider = {
  provide: APP_PIPE,
  useValue: new ValidationPipe({
    // Automatically strip non-whitelisted properties from the request body
    whitelist: true,
    
    // Throw an error if non-whitelisted properties are present
    forbidNonWhitelisted: true,
    
    // Automatically transform payloads to be objects typed according to their DTO classes
    transform: true,
  }),
};