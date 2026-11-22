import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

// Escape LIKE wildcards so a search for "50%" or "a_b" matches literally.
const containsPattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, '\\$&')}%`;

/**
 * Every word of the text must be found in one of the columns, in any order,
 * so "ava mitchell" finds Ava Mitchell although no single column holds both.
 */
export const andWhereEveryWordInAny = <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  columns: string[],
  text: string,
): SelectQueryBuilder<T> => {
  const words = text.split(/\s+/).filter(Boolean);

  words.forEach((word, index) => {
    const parameter = `searchWord${index}`;

    qb.andWhere(
      new Brackets((where) => {
        for (const column of columns) {
          where.orWhere(`${column} ILIKE :${parameter}`, {
            [parameter]: containsPattern(word),
          });
        }
      }),
    );
  });

  return qb;
};

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
