export const toggleSelection = (values: string[], id: string) => {
  return values.includes(id) ? values.filter((x) => x !== id) : [...values, id];
};
