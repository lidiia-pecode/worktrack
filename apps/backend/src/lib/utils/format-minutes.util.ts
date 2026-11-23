/** "2h 25m", or "2h" on the hour. */
export const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};
