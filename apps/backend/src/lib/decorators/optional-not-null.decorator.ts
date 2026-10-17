import { ValidateIf } from 'class-validator';

/**
 * For optional fields whose column needs a value: the field can be left out,
 * but null is validated and refused.
 */
export function OptionalNotNull() {
  return ValidateIf((_, value) => value !== undefined);
}
