const ENTITY_TYPES = [
  "user",
  "team",
  "project",
  "activity",
  "category",
] as const;

type EntityType = (typeof ENTITY_TYPES)[number];

/** Which entity the panel shows, as `?open=<type>:<id>`. */
export interface EntityRef {
  type: EntityType;
  id: string;
}

export const OPEN_PARAM = "open";

const SEPARATOR = ":";

const isEntityType = (value: string): value is EntityType =>
  ENTITY_TYPES.includes(value as EntityType);

export const formatEntityRef = ({ type, id }: EntityRef) =>
  `${type}${SEPARATOR}${id}`;

export const parseEntityRef = (value: string | null): EntityRef | null => {
  if (!value) return null;

  const separatorIndex = value.indexOf(SEPARATOR);
  if (separatorIndex === -1) return null;

  const type = value.slice(0, separatorIndex);
  const id = value.slice(separatorIndex + SEPARATOR.length);

  if (!isEntityType(type) || !id) return null;

  return { type, id };
};

/** The current URL with the panel showing `ref`, or closed; other parameters stay. */
export const urlWithOpenEntity = (
  pathname: string,
  searchParams: URLSearchParams,
  ref: EntityRef | null,
) => {
  const params = new URLSearchParams(searchParams);

  if (ref) params.set(OPEN_PARAM, formatEntityRef(ref));
  else params.delete(OPEN_PARAM);

  return params.size ? `${pathname}?${params}` : pathname;
};
