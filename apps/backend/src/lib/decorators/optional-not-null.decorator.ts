import { ValidateIf } from 'class-validator';

/**
 * For update fields whose column needs a value: leaving the field out keeps
 * the current value, while null is validated and refused.
 */
export function OptionalNotNull() {
  return ValidateIf((_, value) => value !== undefined);
}
