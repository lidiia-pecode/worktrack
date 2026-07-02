/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { PaginationQuery } from '../dtos/PaginationQuery.dto';
import { DEFAULT_PAGINATION_PAGE_SIZE } from '../consts';

type ListResponse<T> = {
  next: string | null;
  previous: string | null;
  count: number;
  results: T[];
};

type RawListResult<T> = {
  results: T[];
  count: number;
};

export function SerializeList<T>(dto: ClassConstructor<T>) {
  return UseInterceptors(new SerializeListInterceptor(dto));
}

export class SerializeListInterceptor<T> implements NestInterceptor {
  constructor(private readonly dto: ClassConstructor<T>) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ListResponse<T>> {
    const req: Request & { query: PaginationQuery } = context
      .switchToHttp()
      .getRequest();

    const { page, pageSize } = this.readPagination(req?.query);

    return next.handle().pipe(
      map((data: RawListResult<T>) => {
        const count = Number(data?.count ?? 0);
        const rawResults = Array.isArray(data?.results) ? data.results : [];

        const results = plainToInstance(this.dto, rawResults, {
          excludeExtraneousValues: true,
        });

        const nextUrl =
          page * pageSize < count
            ? this.buildPageUrl(req, page + 1, pageSize)
            : null;
        const prevUrl =
          page > 1 ? this.buildPageUrl(req, page - 1, pageSize) : null;

        return {
          next: nextUrl,
          previous: prevUrl,
          count,
          results,
        };
      }),
    );
  }

  private readPagination(query: any): {
    page: number;
    pageSize: number;
  } {
    const pageRaw = query?.page ?? query?.page_number ?? 1;
    const sizeRaw =
      query?.page_size ?? query?.pageSize ?? DEFAULT_PAGINATION_PAGE_SIZE;

    const page = this.toInt(pageRaw, 1);
    const pageSize = this.toInt(sizeRaw, DEFAULT_PAGINATION_PAGE_SIZE);

    return {
      page: Math.max(1, page),
      pageSize: Math.max(1, pageSize),
    };
  }

  private toInt(v: any, fallback: number): number {
    const n = typeof v === 'string' ? Number.parseInt(v, 10) : Number(v);
    return Number.isFinite(n) && Number.isInteger(n) ? n : fallback;
  }

  private buildPageUrl(req: any, page: number, pageSize: number): string {
    const protocol = req?.protocol ?? 'http';

    const host =
      (typeof req?.get === 'function' && req.get('host')) ||
      req?.headers?.host ||
      'localhost';

    const path = req?.path ?? req?.url?.split('?')[0] ?? '/';

    const originalQuery = req?.query ?? {};

    const url = new URL(`${protocol}://${host}${path}`);

    for (const [key, value] of Object.entries(originalQuery)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    url.searchParams.set('page', String(page));
    url.searchParams.set('page_size', String(pageSize));

    return url.toString();
  }
}
