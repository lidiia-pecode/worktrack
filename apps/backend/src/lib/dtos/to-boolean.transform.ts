// A query value arrives as text; anything but "true" or "false" is left for
// IsBoolean to refuse.
export const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};
