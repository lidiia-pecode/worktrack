import 'reflect-metadata';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Expose } from 'class-transformer';
import { lastValueFrom, of } from 'rxjs';

import { SerializeListInterceptor } from './serialize-list.interceptor';

class ItemResponse {
  @Expose()
  id!: string;
}

const serialize = (data: unknown) => {
  const handler: CallHandler = { handle: () => of(data) };

  return lastValueFrom(
    new SerializeListInterceptor(ItemResponse).intercept(
      {} as ExecutionContext,
      handler,
    ),
  );
};

describe('SerializeListInterceptor', () => {
  it('returns only the rows and their total, with no page links', async () => {
    const response = await serialize({
      results: [{ id: 'a', secret: 'hidden' }],
      count: 250,
    });

    expect(response).toEqual({ count: 250, results: [{ id: 'a' }] });
    expect(Object.keys(response).sort()).toEqual(['count', 'results']);
  });

  it('answers an empty list when the handler returns nothing usable', async () => {
    expect(await serialize(undefined)).toEqual({ count: 0, results: [] });
  });
});
