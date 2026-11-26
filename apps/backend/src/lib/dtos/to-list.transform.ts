// A list in a query arrives as comma-separated text, e.g. `?roles=A,B`.
export const toList = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.split(',').filter(Boolean) : value;
