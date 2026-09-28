// Arrow keys wrap around, as in the WAI-ARIA tabs pattern.
export const getNextTabIndex = (
  key: string,
  currentIndex: number,
  tabCount: number,
): number | null => {
  switch (key) {
    case "ArrowRight":
      return (currentIndex + 1) % tabCount;
    case "ArrowLeft":
      return (currentIndex - 1 + tabCount) % tabCount;
    case "Home":
      return 0;
    case "End":
      return tabCount - 1;
    default:
      return null;
  }
};
