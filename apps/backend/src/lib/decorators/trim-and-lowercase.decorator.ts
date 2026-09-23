import { Transform, TransformFnParams } from 'class-transformer';

/**
 * For identifiers compared exactly, such as emails and usernames. Text a person
 * typed for display, such as a name, uses `TrimString` instead.
 */
export function TrimAndLowercase() {
  return Transform(({ value }: TransformFnParams): string | undefined => {
    if (typeof value !== 'string') {
      return undefined;
    }

    return value.trim().toLowerCase();
  });
}
