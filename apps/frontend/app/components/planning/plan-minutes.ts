/** Plans are made in quarter hours, as the API requires. */
export const PLAN_MINUTE_STEP = 15;

export const isOnPlanStep = (minutes: number) =>
  minutes % PLAN_MINUTE_STEP === 0;

/** Down to the last whole step: the most a picker in steps can reach. */
export const toPlanStep = (minutes: number) =>
  Math.floor(minutes / PLAN_MINUTE_STEP) * PLAN_MINUTE_STEP;
