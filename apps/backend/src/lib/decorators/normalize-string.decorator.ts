import { Transform, TransformFnParams } from 'class-transformer';

export function NormalizeString() {
  return Transform(({ value }: TransformFnParams): string | undefined => {
    if (typeof value !== 'string') {
      return undefined;
    }

    return value.trim().toLowerCase();
  });
}
