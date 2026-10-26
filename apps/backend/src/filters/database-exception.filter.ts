import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    // The driver's `detail` and some messages (an invalid uuid, a bad date)
    // repeat the values sent, personal data included, so neither the log nor
    // the answer carries them.
    const { code, constraint, table } = exception.driverError as {
      code?: string;
      constraint?: string;
      table?: string;
    };

    this.logger.error(
      `Database error ${code} on ${table ?? 'unknown table'} (${constraint ?? 'no constraint'})`,
    );

    if (code === '23505') {
      return response.status(409).json({
        statusCode: 409,
        error: 'Conflict',
        message: 'This already exists',
      });
    }

    if (code === '23503') {
      return response.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Cannot delete or update resource because it is referenced by another entity',
      });
    }

    return response.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal database error',
    });
  }
}
