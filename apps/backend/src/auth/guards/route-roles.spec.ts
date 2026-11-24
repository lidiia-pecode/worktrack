import 'src/lib/testing/app-env';
import 'reflect-metadata';
import { DynamicModule, ExecutionContext, Type } from '@nestjs/common';
import { METHOD_METADATA, MODULE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';

import { AppModule } from 'src/app.module';
import { UserRole } from 'src/users/enums/user-role.enum';

import { RolesGuard } from './RolesGuard';

/**
 * Who may call each route, for every controller the app registers. Runs the
 * real guard rather than reading the decorator, so a change to either one,
 * or a route added without a line here, fails. Which routes need no session
 * at all is the HTTP spec's job (`app.http.spec.ts`).
 */

const EVERY_ROLE = Object.values(UserRole);
const OWNER_AND_MANAGER = [UserRole.OWNER, UserRole.MANAGER];
const OWNER = [UserRole.OWNER];

const ROUTE_ROLES: Record<string, Record<string, UserRole[]>> = {
  AbsencesController: {
    getAllAbsences: EVERY_ROLE,
    getDay: EVERY_ROLE,
    createAbsence: EVERY_ROLE,
    updateAbsence: EVERY_ROLE,
    deleteAbsence: EVERY_ROLE,
  },
  ActivitiesController: {
    list: EVERY_ROLE,
    getById: EVERY_ROLE,
    create: OWNER,
    update: OWNER,
    getArchiveImpact: OWNER,
    archive: OWNER,
    unarchive: OWNER,
  },
  ActCategoriesController: {
    list: EVERY_ROLE,
    getById: EVERY_ROLE,
    create: OWNER,
    update: OWNER,
    getArchiveImpact: OWNER,
    archive: OWNER,
    unarchive: OWNER,
  },
  AuthController: {
    googleSignup: EVERY_ROLE,
    googleSignupCallback: EVERY_ROLE,
    completeGoogleSignup: EVERY_ROLE,
    googleLogin: EVERY_ROLE,
    googleLoginCallback: EVERY_ROLE,
    googleLink: EVERY_ROLE,
    googleLinkCallback: EVERY_ROLE,
    completeGoogleLinkWithPassword: EVERY_ROLE,
    signup: EVERY_ROLE,
    login: EVERY_ROLE,
    refresh: EVERY_ROLE,
    logout: EVERY_ROLE,
    logoutAll: EVERY_ROLE,
    changePassword: EVERY_ROLE,
    forgotPassword: EVERY_ROLE,
    resetPassword: EVERY_ROLE,
  },
  CapacityController: {
    getExpected: EVERY_ROLE,
    getForUser: OWNER,
    setForUser: OWNER,
    cancelUpcoming: OWNER,
  },
  CompaniesController: {
    findCurrentCompany: EVERY_ROLE,
    update: OWNER,
    setStandardDay: OWNER,
    cancelStandardDayChange: OWNER,
  },
  InvitationsController: {
    listPending: OWNER_AND_MANAGER,
    create: OWNER_AND_MANAGER,
    resend: OWNER_AND_MANAGER,
    revoke: OWNER_AND_MANAGER,
    validate: EVERY_ROLE,
    completeWithPassword: EVERY_ROLE,
    startGoogleInvitation: EVERY_ROLE,
    authorizeGoogleInvitation: EVERY_ROLE,
    completeGoogleInvitation: EVERY_ROLE,
  },
  NotificationsController: {
    list: EVERY_ROLE,
    markRead: EVERY_ROLE,
  },
  OnboardingController: {
    getOwnerSetupState: OWNER,
    skipOwnerSetup: OWNER,
  },
  PeopleReportController: {
    getPeopleReport: EVERY_ROLE,
    getOverview: OWNER_AND_MANAGER,
    exportHours: OWNER_AND_MANAGER,
  },
  PlanningController: {
    list: EVERY_ROLE,
    getWeek: EVERY_ROLE,
    getMonth: EVERY_ROLE,
    countRemovable: OWNER_AND_MANAGER,
    planPeriod: OWNER_AND_MANAGER,
    previewPeriod: OWNER_AND_MANAGER,
    deletePeriodPlans: OWNER_AND_MANAGER,
  },
  ProjectsController: {
    getAll: OWNER_AND_MANAGER,
    listOwnProjects: EVERY_ROLE,
    listAssignableActivities: EVERY_ROLE,
    getById: OWNER_AND_MANAGER,
    create: OWNER_AND_MANAGER,
    update: OWNER_AND_MANAGER,
    getArchiveImpact: OWNER,
    archive: OWNER,
    unarchive: OWNER,
    addMember: OWNER_AND_MANAGER,
    removeMember: OWNER_AND_MANAGER,
    addActivity: OWNER_AND_MANAGER,
    removeActivity: OWNER_AND_MANAGER,
    listUsers: OWNER_AND_MANAGER,
  },
  ReportingController: {
    listPeriods: EVERY_ROLE,
    getHoursReport: EVERY_ROLE,
    reopenPeriod: OWNER,
    closePeriod: OWNER,
  },
  TeamsController: {
    list: OWNER_AND_MANAGER,
    getTeamById: OWNER_AND_MANAGER,
    removeMember: OWNER_AND_MANAGER,
    createTeam: OWNER,
    updateTeam: OWNER,
    getArchiveImpact: OWNER,
    archiveTeam: OWNER,
    unarchiveTeam: OWNER,
    addMember: OWNER,
    changeManager: OWNER,
  },
  TimeLogsController: {
    getAllTimeLogs: EVERY_ROLE,
    getTeamSummary: EVERY_ROLE,
    getTimeLogById: EVERY_ROLE,
    createTimeLog: EVERY_ROLE,
    updateTimeLog: EVERY_ROLE,
    deleteTimeLog: EVERY_ROLE,
  },
  UsersController: {
    getCurrentUser: EVERY_ROLE,
    updateMyProfile: EVERY_ROLE,
    getAllUsersPaginated: OWNER_AND_MANAGER,
    getAssignableUsers: OWNER_AND_MANAGER,
    getUserById: OWNER_AND_MANAGER,
    updateUser: OWNER,
    getDeactivationImpact: OWNER,
    archive: OWNER,
    unarchive: OWNER,
  },
};

type ModuleImport = Type | DynamicModule | Promise<DynamicModule>;

/** Every controller in the module graph under `root`, as Nest would load it. */
const registeredControllers = (root: Type): Type[] => {
  const visited = new Set<Type>();
  const controllers = new Set<Type>();

  const visit = (entry: ModuleImport | undefined): void => {
    // `forRoot` modules that load asynchronously hold configuration, never
    // controllers.
    if (!entry || entry instanceof Promise) return;

    const moduleClass = 'module' in entry ? entry.module : entry;
    if (visited.has(moduleClass)) return;
    visited.add(moduleClass);

    const declared = (key: string): ModuleImport[] =>
      (Reflect.getMetadata(key, moduleClass) as ModuleImport[]) ?? [];
    const dynamic = 'module' in entry ? entry : undefined;

    [
      ...declared(MODULE_METADATA.CONTROLLERS),
      ...(dynamic?.controllers ?? []),
    ].forEach((controller) => controllers.add(controller as Type));
    [...declared(MODULE_METADATA.IMPORTS), ...(dynamic?.imports ?? [])].forEach(
      (imported) => visit(imported as ModuleImport),
    );
  };

  visit(root);
  return [...controllers];
};

const routeHandlers = (controller: Type): string[] =>
  Object.getOwnPropertyNames(controller.prototype).filter(
    (name) =>
      name !== 'constructor' &&
      Reflect.getMetadata(
        METHOD_METADATA,
        Reflect.get(controller.prototype, name) as object,
      ) !== undefined,
  );

const guard = new RolesGuard(new Reflector());

const allowedRoles = (controller: Type, handler: string): UserRole[] =>
  EVERY_ROLE.filter((role) =>
    guard.canActivate({
      getHandler: () => Reflect.get(controller.prototype, handler) as object,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    } as unknown as ExecutionContext),
  );

const controllers = registeredControllers(AppModule);

const routes = controllers.flatMap((controller) =>
  routeHandlers(controller).map((handler) => ({
    controller,
    handler,
    name: `${controller.name}.${handler}`,
  })),
);

describe('route roles', () => {
  it('lists every controller and route the app registers, and nothing else', () => {
    const listed = Object.entries(ROUTE_ROLES).flatMap(
      ([controller, handlers]) =>
        Object.keys(handlers).map((handler) => `${controller}.${handler}`),
    );

    expect(routes.map(({ name }) => name).sort()).toEqual(listed.sort());
  });

  it.each(routes)(
    'lets the right roles call $name',
    ({ controller, handler }) => {
      expect(allowedRoles(controller, handler).sort()).toEqual(
        [...(ROUTE_ROLES[controller.name]?.[handler] ?? [])].sort(),
      );
    },
  );
});
