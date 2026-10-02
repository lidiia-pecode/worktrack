import { Transform, TransformFnParams } from 'class-transformer';

export function TrimString({ keepNull = false } = {}) {
  return Transform(({ value }: TransformFnParams): unknown => {
    if (typeof value === 'string') return value.trim();
    if (value === null && !keepNull) return undefined;

    return value;
  });
}
