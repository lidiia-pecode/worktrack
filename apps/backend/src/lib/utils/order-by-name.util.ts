import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/** Unicode's own order, which Postgres has with or without the OS locales. */
const NAME_COLLATION = '"und-x-icu"';

/**
 * Orders by names as people read them, ignoring case and accents ("Cloud"
 * before "CRM"), whatever the database's collation, then by id so pages
 * never overlap. Each name is selected under an alias, since TypeORM pages a
 * query with joins only by selected columns.
 */
export const orderByName = <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  nameColumns: string[],
  idColumn: string,
): SelectQueryBuilder<T> => {
  nameColumns.forEach((column, index) => {
    const alias = `name_order_${index}`;
    qb.addSelect(`${column} COLLATE ${NAME_COLLATION}`, alias).addOrderBy(
      alias,
      'ASC',
    );
  });

  return qb.addOrderBy(idColumn, 'ASC');
};
