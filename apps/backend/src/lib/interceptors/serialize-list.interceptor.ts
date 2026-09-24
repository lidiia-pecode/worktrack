import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClassConstructor, plainToInstance } from 'class-transformer';

type ListResult<T> = {
  count: number;
  results: T[];
};

export function SerializeList<T>(dto: ClassConstructor<T>) {
  return UseInterceptors(new SerializeListInterceptor(dto));
}

export class SerializeListInterceptor<T> implements NestInterceptor {
  constructor(private readonly dto: ClassConstructor<T>) {}

  intercept(_: ExecutionContext, next: CallHandler): Observable<ListResult<T>> {
    return next.handle().pipe(
      map((data: ListResult<T>) => {
        const count = Number(data?.count ?? 0);
        const rawResults = Array.isArray(data?.results) ? data.results : [];

        const results = plainToInstance(this.dto, rawResults, {
          excludeExtraneousValues: true,
        });

        return { count, results };
      }),
    );
  }
}
