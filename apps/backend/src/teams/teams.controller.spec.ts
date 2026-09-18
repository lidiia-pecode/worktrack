import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from 'src/auth/guards';
import { UserRole } from 'src/users/enums/user-role.enum';

import { TeamsController } from './teams.controller';

/**
 * Team structure decides who a manager can see, so the routes that change it
 * must stay Owner-only. This runs the real guard rather than reading the
 * decorator, so a change to either one is caught.
 */

type Handler = keyof TeamsController;

const OWNER_ONLY: Handler[] = [
  'createTeam',
  'updateTeam',
  'archiveTeam',
  'unarchiveTeam',
  'addMember',
  'updateMember',
];

const OPEN_TO_MANAGER: Handler[] = ['list', 'getTeamById', 'removeMember'];

describe('TeamsController route roles', () => {
  const guard = new RolesGuard(new Reflector());

  const allows = (handler: Handler, role: UserRole): boolean =>
    guard.canActivate({
      getHandler: () => TeamsController.prototype[handler],
      getClass: () => TeamsController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    } as unknown as ExecutionContext);

  it.each(OWNER_ONLY)('refuses a manager on %s', (handler) => {
    expect(allows(handler, UserRole.MANAGER)).toBe(false);
  });

  it.each(OPEN_TO_MANAGER)('allows a manager on %s', (handler) => {
    expect(allows(handler, UserRole.MANAGER)).toBe(true);
  });

  it.each([...OWNER_ONLY, ...OPEN_TO_MANAGER])(
    'allows an owner on %s',
    (handler) => {
      expect(allows(handler, UserRole.OWNER)).toBe(true);
    },
  );

  it.each([...OWNER_ONLY, ...OPEN_TO_MANAGER])(
    'refuses an employee on %s',
    (handler) => {
      expect(allows(handler, UserRole.EMPLOYEE)).toBe(false);
    },
  );
});
