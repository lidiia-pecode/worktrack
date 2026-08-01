import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const driverError = exception.driverError as {
      code?: string;
    };

    if (driverError.code === '23505') {
      return response.status(409).json({
        statusCode: 409,
        message: 'Resource already exists',
      });
    }

    return response.status(500).json({
      statusCode: 500,
      message: 'Database error',
    });
  }
}
