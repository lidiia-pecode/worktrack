/** "1 project", "3 projects". */
export const countLabel = (count: number, one: string, many: string) =>
  `${count} ${byCount(count, one, many)}`;

/** The word for one or for several, such as "it" or "them". */
export const byCount = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

const listFormat = new Intl.ListFormat("en", { type: "conjunction" });

/** "Backend, QA and Design". */
export const listNames = (names: string[]) => listFormat.format(names);

/** The one name, or how many: "Backend", "3 activities". */
export const nameOrCount = (names: string[], plural: string) =>
  names.length === 1 ? names[0] : `${names.length} ${plural}`;
