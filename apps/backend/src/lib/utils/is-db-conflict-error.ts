import { QueryFailedError } from 'typeorm';

export function isDatabaseConflictError(error: unknown): boolean {
  if (error instanceof QueryFailedError) {
    const driverError = error.driverError as { code?: string } | undefined;
    return driverError?.code === '23505' || driverError?.code === '23P01';
  }
  return false;
}
