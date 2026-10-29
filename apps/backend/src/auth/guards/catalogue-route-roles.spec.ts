import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ActivitiesController } from 'src/activities/activities.controller';
import { ActCategoriesController } from 'src/activity-categories/activity-categories.controller';
import { ProjectsController } from 'src/projects/projects.controller';
import { UserRole } from 'src/users/enums/user-role.enum';

import { RolesGuard } from './RolesGuard';

/**
 * Company-wide structure is the owner's: the catalogue, and archiving a
 * project, which reaches everyone on it. Managers run their projects.
 * This runs the real guard rather than reading the decorator, so a change to
 * either one is caught.
 */

type Controller = abstract new (...args: never[]) => object;

interface RouteRoles {
  controller: Controller;
  ownerOnly: string[];
  openToManager: string[];
}

const ROUTES: RouteRoles[] = [
  {
    controller: ProjectsController,
    ownerOnly: ['archive', 'unarchive'],
    openToManager: [
      'getAll',
      'getById',
      'create',
      'update',
      'addMember',
      'removeMember',
      'addActivity',
      'removeActivity',
      'listUsers',
    ],
  },
  {
    controller: ActivitiesController,
    ownerOnly: ['create', 'update', 'getArchiveImpact', 'archive', 'unarchive'],
    openToManager: ['list', 'getById'],
  },
  {
    controller: ActCategoriesController,
    ownerOnly: ['create', 'update', 'getArchiveImpact', 'archive', 'unarchive'],
    openToManager: ['list', 'getById'],
  },
];

const guard = new RolesGuard(new Reflector());

const allows = (
  controller: Controller,
  handler: string,
  role: UserRole,
): boolean =>
  guard.canActivate({
    getHandler: () =>
      (controller.prototype as Record<string, unknown>)[handler],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext);

const cases = (pick: (routes: RouteRoles) => string[]) =>
  ROUTES.flatMap((routes) =>
    pick(routes).map((handler) => ({
      controller: routes.controller,
      name: `${routes.controller.name}.${handler}`,
      handler,
    })),
  );

describe('catalogue and project route roles', () => {
  it.each(cases((routes) => routes.ownerOnly))(
    'refuses a manager on $name',
    ({ controller, handler }) => {
      expect(allows(controller, handler, UserRole.MANAGER)).toBe(false);
      expect(allows(controller, handler, UserRole.OWNER)).toBe(true);
    },
  );

  it.each(cases((routes) => routes.openToManager))(
    'allows a manager on $name',
    ({ controller, handler }) => {
      expect(allows(controller, handler, UserRole.MANAGER)).toBe(true);
    },
  );
});
