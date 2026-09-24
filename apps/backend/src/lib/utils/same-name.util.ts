import { Raw } from 'typeorm';

/**
 * Matches the same name ignoring case and surrounding spaces, as the
 * `LOWER(name)` unique indexes do. `ILike` would read `_` and `%` as wildcards.
 */
export const sameName = (name: string) =>
  Raw((column) => `LOWER(${column}) = LOWER(:sameName)`, {
    sameName: name.trim(),
  });
