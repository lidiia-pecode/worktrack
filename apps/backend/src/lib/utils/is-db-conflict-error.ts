// import { QueryFailedError } from 'typeorm';

// export function isDatabaseConflictError(error: unknown): boolean {
//   if (error instanceof QueryFailedError) {
//     const driverError = error.driverError as { code?: string } | undefined;
//     return driverError?.code === '23505' || driverError?.code === '23P01';
//   }
//   return false;
// }

import { QueryFailedError } from 'typeorm';

interface PostgresDriverError {
  code?: string;
  constraint?: string;
  detail?: string;
}

export function isDatabaseConflictError(
  error: unknown,
): error is QueryFailedError & { driverError: PostgresDriverError } {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as PostgresDriverError | undefined;
  return driverError?.code === '23505' || driverError?.code === '23P01';
}
