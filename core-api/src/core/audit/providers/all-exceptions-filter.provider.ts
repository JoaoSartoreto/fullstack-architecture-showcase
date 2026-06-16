import { Provider } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';

export const globalAllExceptionsFilterProvider: Provider = {
    provide: APP_FILTER,
    useClass: AllExceptionsFilter,
};