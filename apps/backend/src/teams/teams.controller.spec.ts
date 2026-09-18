import 'reflect-metadata';

import { ROLES_KEY } from 'src/lib/decorators';
import { UserRole } from 'src/users/enums/user-role.enum';

import { TeamsController } from './teams.controller';

/**
 * Team structure decides who a manager can see, so the routes that change it
 * must stay Owner-only.
 */

type Handler = keyof TeamsController;

const rolesFor = (handler: Handler): UserRole[] =>
  Reflect.getMetadata(
    ROLES_KEY,
    TeamsController.prototype[handler],
  ) as UserRole[];

describe('TeamsController route roles', () => {
  it.each<Handler>([
    'createTeam',
    'updateTeam',
    'archiveTeam',
    'unarchiveTeam',
    'addMember',
    'updateMember',
  ])('%s is owner-only', (handler) => {
    expect(rolesFor(handler)).toEqual([UserRole.OWNER]);
  });

  it.each<Handler>(['list', 'getTeamById', 'removeMember'])(
    '%s stays available to a manager',
    (handler) => {
      expect(rolesFor(handler)).toEqual([UserRole.OWNER, UserRole.MANAGER]);
    },
  );
});
