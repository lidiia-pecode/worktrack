import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const driverError = exception.driverError as {
      code?: string;
      detail?: string;
      constraint?: string;
    };

    this.logger.error('DATABASE ERROR');
    this.logger.error(`exception: ${exception.constructor.name}`);
    this.logger.error(`driverError: ${JSON.stringify(driverError)}`);
    this.logger.error(`code: ${driverError?.code}`);
    this.logger.error(`constraint: ${driverError?.constraint}`);
    this.logger.error(`detail: ${driverError?.detail}`);

    if (driverError.code === '23505') {
      const detail = driverError.detail || 'Resource already exists';

      return response.status(409).json({
        statusCode: 409,
        error: 'Conflict',
        message: detail,
      });
    }

    if (driverError.code === '23503') {
      return response.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Cannot delete or update resource because it is referenced by another entity',
      });
    }

    this.logger.error(
      `Database Exception: ${exception.message}`,
      exception.stack,
    );

    return response.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal database error',
    });
  }
}
