import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from 'src/auth/guards';
import { UserRole } from 'src/users/enums/user-role.enum';

import { ReportingController } from './reporting.controller';
import { UtilisationController } from './utilisation/utilisation.controller';

type Handler = keyof ReportingController;

const OWNER_ONLY: Handler[] = ['reopenPeriod', 'closePeriod'];
const OWNER_AND_MANAGER: Handler[] = ['getHoursReport'];
// Employees read their own figures here; no employee screen shows them.
const EVERY_ROLE: Handler[] = ['listPeriods', 'getPlannedVsActualReport'];

describe('ReportingController route roles', () => {
  const guard = new RolesGuard(new Reflector());

  const allows = (handler: Handler, role: UserRole): boolean =>
    guard.canActivate({
      getHandler: () => ReportingController.prototype[handler],
      getClass: () => ReportingController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    } as unknown as ExecutionContext);

  it.each(OWNER_ONLY)('refuses a manager on %s', (handler) => {
    expect(allows(handler, UserRole.MANAGER)).toBe(false);
  });

  it.each(OWNER_AND_MANAGER)('allows a manager on %s', (handler) => {
    expect(allows(handler, UserRole.MANAGER)).toBe(true);
  });

  it.each([...OWNER_ONLY, ...OWNER_AND_MANAGER])(
    'allows an owner on %s',
    (handler) => {
      expect(allows(handler, UserRole.OWNER)).toBe(true);
    },
  );

  it.each([...OWNER_ONLY, ...OWNER_AND_MANAGER])(
    'refuses an employee on %s',
    (handler) => {
      expect(allows(handler, UserRole.EMPLOYEE)).toBe(false);
    },
  );

  it.each(EVERY_ROLE)('allows an employee on %s', (handler) => {
    expect(allows(handler, UserRole.EMPLOYEE)).toBe(true);
  });
});

describe('UtilisationController route roles', () => {
  const guard = new RolesGuard(new Reflector());
  const handler: keyof UtilisationController = 'getUtilisation';

  const allows = (role: UserRole): boolean =>
    guard.canActivate({
      getHandler: () => UtilisationController.prototype[handler],
      getClass: () => UtilisationController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    } as unknown as ExecutionContext);

  it('allows owners and managers, and refuses employees', () => {
    expect(allows(UserRole.OWNER)).toBe(true);
    expect(allows(UserRole.MANAGER)).toBe(true);
    expect(allows(UserRole.EMPLOYEE)).toBe(false);
  });
});
