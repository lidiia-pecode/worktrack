import { ValidationError, ValidationPipe } from '@nestjs/common';

import { createValidationException } from './validation-exception.util';

/** Each failing field by its path, e.g. `projects.0.minutesPerDay`. */
const fieldErrors = (
  errors: ValidationError[],
  parentPath = '',
  collected: Record<string, string[]> = {},
): Record<string, string[]> => {
  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      collected[path] = Object.values(error.constraints);
    }
    if (error.children?.length) {
      fieldErrors(error.children, path, collected);
    }
  }

  return collected;
};

/**
 * How every payload is checked: the global pipe, and a guard that must check
 * a body before the pipes run (sign-in).
 */
export const createValidationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) =>
      createValidationException(fieldErrors(errors)),
  });
