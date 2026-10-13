import 'reflect-metadata';
import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { lastValueFrom, of, Observable } from 'rxjs';

import { UsersController } from './users.controller';

// The service returns plain objects, which the global serializer doesn't strip,
// so every route returning a user needs its own serializer to hide its secrets.

type Handler = keyof UsersController;

const RETURNS_USER: Handler[] = [
  'getCurrentUser',
  'updateMyProfile',
  'getUserById',
  'updateUser',
  'archive',
  'unarchive',
];

const RETURNS_USER_LIST: Handler[] = [
  'getAllUsersPaginated',
  'getAssignableUsers',
];

const storedUser = {
  id: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.test',
  passwordHash: '$2b$10$secret',
  googleId: 'google-123',
};

const respond = async (handler: Handler, data: unknown): Promise<string> => {
  const interceptors = (Reflect.getMetadata(
    INTERCEPTORS_METADATA,
    UsersController.prototype[handler],
  ) ?? []) as NestInterceptor[];

  let response: Observable<unknown> = of(data);
  for (const interceptor of interceptors) {
    const next: CallHandler = { handle: () => response };
    response = interceptor.intercept(
      {} as ExecutionContext,
      next,
    ) as Observable<unknown>;
  }

  return JSON.stringify(await lastValueFrom(response));
};

describe('UsersController responses', () => {
  it('covers every route', () => {
    const handlers = Object.getOwnPropertyNames(
      UsersController.prototype,
    ).filter((name) => name !== 'constructor');

    expect(handlers.sort()).toEqual(
      [...RETURNS_USER, ...RETURNS_USER_LIST].sort(),
    );
  });

  it.each(RETURNS_USER)('%s returns no credentials', async (handler) => {
    const body = await respond(handler, storedUser);

    expect(body).toContain('Ada');
    expect(body).not.toContain('secret');
    expect(body).not.toContain('google-123');
  });

  it.each(RETURNS_USER_LIST)('%s returns no credentials', async (handler) => {
    const body = await respond(handler, { results: [storedUser], count: 1 });

    expect(body).toContain('Ada');
    expect(body).not.toContain('secret');
    expect(body).not.toContain('google-123');
  });
});
