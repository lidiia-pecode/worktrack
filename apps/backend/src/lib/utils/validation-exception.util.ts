import { BadRequestException } from '@nestjs/common';

// The 400 body the frontend reads field errors from.
export function createValidationException(
  errors: Record<string, string[]>,
): BadRequestException {
  return new BadRequestException({ statusCode: 400, errors });
}
