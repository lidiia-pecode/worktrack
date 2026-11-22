import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

// Escape LIKE wildcards so a search for "50%" or "a_b" matches literally.
const containsPattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, '\\$&')}%`;

export const andWhereAnyContains = <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  columns: string[],
  text: string,
): SelectQueryBuilder<T> => {
  const search = containsPattern(text);

  return qb.andWhere(
    new Brackets((where) => {
      for (const column of columns) {
        where.orWhere(`${column} ILIKE :search`, { search });
      }
    }),
  );
};
