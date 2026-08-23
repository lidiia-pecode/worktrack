import { Transform, TransformFnParams } from 'class-transformer';

export function TrimString() {
  return Transform(({ value }: TransformFnParams): string | undefined => {
    if (typeof value !== 'string') {
      return undefined;
    }

    return value.trim();
  });
}
