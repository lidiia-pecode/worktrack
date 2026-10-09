import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { ActCategoriesService } from 'src/activity-categories/activity-categories.service';

import { Activity } from './entities/activity.entity';
import { ActivitiesService } from './activities.service';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { ActCategoryStatus } from 'src/activity-categories/enums/category-status.enum';
import { ActivityStatus } from './enums/activity-status.enum';
import { ActiveActivitiesAction } from 'src/activity-categories/enums/active-activities-action.enum';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { randomUUID } from 'node:crypto';

/**
 * Runs against the development database, so it needs the Docker stack. The
 * name checks are SQL, and a mocked repository would not show how `_` and `%`
 * are matched.
 */

const RUN = Date.now();
const SLUG = `activity-names-test-${RUN}`;

describe('Activity and category names', () => {
  let dataSource: DataSource;
  let categories: ActCategoriesService;
  let activities: ActivitiesService;

  let companyId: string;
  let categoryId: string;
  let otherCategoryId: string;

  const createProject = async (
    name: string,
    activityId: string,
    { linkActive = true, status = ProjectStatus.ACTIVE } = {},
  ): Promise<void> => {
    const project = await dataSource
      .getRepository(Project)
      .save({ companyId, name: `${name} ${RUN}`, status });

    await dataSource.getRepository(ProjectActivity).save({
      companyId,
      projectId: project.id,
      activityId,
      isActive: linkActive,
    });
  };

  const callerWith = (role: UserRole): AuthUser => ({
    id: randomUUID(),
    email: `${role}-${RUN}@activities.test`,
    companyId,
    role,
  });

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    categories = new ActCategoriesService(
      dataSource.getRepository(ActCategory),
      dataSource,
    );
    activities = new ActivitiesService(
      dataSource.getRepository(Activity),
      categories,
      dataSource.getRepository(ProjectActivity),
      dataSource,
    );

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });
    companyId = company.id;

    categoryId = (await categories.create({ name: 'Delivery' }, companyId)).id;
    otherCategoryId = (await categories.create({ name: 'Support' }, companyId))
      .id;
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    // Project links hold on to their activity, and go with their project.
    await dataSource.getRepository(Project).delete({ companyId });
    await dataSource.getRepository(Activity).delete({ companyId });
    await dataSource.getRepository(ActCategory).delete({ companyId });
    await dataSource.getRepository(Company).delete({ slug: SLUG });
    await dataSource.destroy();
  });

  describe('categories', () => {
    it('treats _ and % as plain characters, not wildcards', async () => {
      await categories.create({ name: 'Axb' }, companyId);

      await expect(
        categories.create({ name: 'A_b' }, companyId),
      ).resolves.toBeDefined();
      await expect(
        categories.create({ name: 'A%b' }, companyId),
      ).resolves.toBeDefined();
    });

    it('still refuses the same name in another case or with spaces', async () => {
      await expect(
        categories.create({ name: 'delivery' }, companyId),
      ).rejects.toThrow(ConflictException);
      await expect(
        categories.create({ name: ' Delivery ' }, companyId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('activities', () => {
    it('treats _ and % as plain characters, not wildcards', async () => {
      await activities.create({ name: 'Bxc', categoryId }, companyId);

      await expect(
        activities.create({ name: 'B_c', categoryId }, companyId),
      ).resolves.toBeDefined();
      await expect(
        activities.create({ name: 'B%c', categoryId }, companyId),
      ).resolves.toBeDefined();
    });

    it('still refuses the same name in another case or with spaces', async () => {
      await activities.create({ name: 'Review', categoryId }, companyId);

      await expect(
        activities.create({ name: 'REVIEW', categoryId }, companyId),
      ).rejects.toThrow(ConflictException);
      await expect(
        activities.create({ name: ' review ', categoryId }, companyId),
      ).rejects.toThrow(ConflictException);
    });

    it('keeps an activity name unique across the company, not per category', async () => {
      await activities.create({ name: 'Planning', categoryId }, companyId);

      await expect(
        activities.create(
          { name: 'planning', categoryId: otherCategoryId },
          companyId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('active activities only in active categories', () => {
    it('refuses to archive a category while it has active activities', async () => {
      const category = await categories.create({ name: 'Design' }, companyId);
      const activity = await activities.create(
        { name: 'Wireframes', categoryId: category.id },
        companyId,
      );

      await expect(categories.archive(category.id, companyId)).rejects.toThrow(
        ConflictException,
      );

      await activities.archive(activity.id, companyId);

      await expect(
        categories.archive(category.id, companyId),
      ).resolves.toMatchObject({ status: ActCategoryStatus.ARCHIVED });
    });

    it('refuses to put an activity in an archived category', async () => {
      const category = await categories.create({ name: 'Legacy' }, companyId);
      await categories.archive(category.id, companyId);

      await expect(
        activities.create(
          { name: 'Old work', categoryId: category.id },
          companyId,
        ),
      ).rejects.toThrow(BadRequestException);

      const activity = await activities.create(
        { name: 'Moving work', categoryId },
        companyId,
      );

      await expect(
        activities.update(activity.id, { categoryId: category.id }, companyId),
      ).rejects.toThrow(BadRequestException);
    });

    it('restores an activity only once its category is active', async () => {
      const category = await categories.create({ name: 'Training' }, companyId);
      const activity = await activities.create(
        { name: 'Onboarding sessions', categoryId: category.id },
        companyId,
      );
      await activities.archive(activity.id, companyId);
      await categories.archive(category.id, companyId);

      await expect(
        activities.unarchive(activity.id, companyId),
      ).rejects.toThrow(ConflictException);

      await categories.unarchive(category.id, companyId);

      await expect(
        activities.unarchive(activity.id, companyId),
      ).resolves.toMatchObject({ status: ActivityStatus.ACTIVE });
    });
  });

  describe('resolving a blocked archive or restore', () => {
    it('moves the active activities to another category, then archives', async () => {
      const category = await categories.create({ name: 'QA' }, companyId);
      const target = await categories.create({ name: 'Testing' }, companyId);
      const kept = await activities.create(
        { name: 'Regression', categoryId: category.id },
        companyId,
      );
      const archived = await activities.create(
        { name: 'Old smoke tests', categoryId: category.id },
        companyId,
      );
      await activities.archive(archived.id, companyId);

      await categories.archive(category.id, companyId, {
        activities: ActiveActivitiesAction.MOVE,
        moveToCategoryId: target.id,
      });

      const moved = await activities.getById(kept.id, companyId);
      const untouched = await activities.getById(archived.id, companyId);
      expect(moved).toMatchObject({
        categoryId: target.id,
        status: ActivityStatus.ACTIVE,
      });
      expect(untouched.categoryId).toBe(category.id);
    });

    it('archives the active activities together with the category', async () => {
      const category = await categories.create({ name: 'Events' }, companyId);
      const activity = await activities.create(
        { name: 'Conference', categoryId: category.id },
        companyId,
      );

      await categories.archive(category.id, companyId, {
        activities: ActiveActivitiesAction.ARCHIVE,
      });

      await expect(
        activities.getById(activity.id, companyId),
      ).resolves.toMatchObject({ status: ActivityStatus.ARCHIVED });
    });

    it('refuses a move with no target, the same category or an archived one', async () => {
      const category = await categories.create({ name: 'Ops' }, companyId);
      const archivedTarget = await categories.create(
        { name: 'Old ops' },
        companyId,
      );
      await categories.archive(archivedTarget.id, companyId);
      const activity = await activities.create(
        { name: 'Deployments', categoryId: category.id },
        companyId,
      );

      await expect(
        categories.archive(category.id, companyId, {
          activities: ActiveActivitiesAction.MOVE,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        categories.archive(category.id, companyId, {
          activities: ActiveActivitiesAction.MOVE,
          moveToCategoryId: category.id,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        categories.archive(category.id, companyId, {
          activities: ActiveActivitiesAction.MOVE,
          moveToCategoryId: archivedTarget.id,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        activities.getById(activity.id, companyId),
      ).resolves.toMatchObject({
        categoryId: category.id,
        status: ActivityStatus.ACTIVE,
      });
    });

    it('restores an activity into another active category', async () => {
      const category = await categories.create({ name: 'Sales' }, companyId);
      const target = await categories.create({ name: 'Presales' }, companyId);
      const activity = await activities.create(
        { name: 'Demos', categoryId: category.id },
        companyId,
      );
      await activities.archive(activity.id, companyId);
      await categories.archive(category.id, companyId);

      await activities.unarchive(activity.id, companyId, {
        categoryId: target.id,
      });

      await expect(
        activities.getById(activity.id, companyId),
      ).resolves.toMatchObject({
        categoryId: target.id,
        status: ActivityStatus.ACTIVE,
      });
    });

    it('lists the active activities and the projects that offer them', async () => {
      const category = await categories.create({ name: 'Content' }, companyId);
      const writing = await activities.create(
        { name: 'Writing', categoryId: category.id },
        companyId,
      );
      const editing = await activities.create(
        { name: 'Editing', categoryId: category.id },
        companyId,
      );
      const project = await dataSource
        .getRepository(Project)
        .save({ companyId, name: `Blog ${RUN}` });
      await dataSource
        .getRepository(ProjectActivity)
        .save({ companyId, projectId: project.id, activityId: writing.id });

      const impact = await categories.getArchiveImpact(category.id, companyId);

      expect(impact.activities).toEqual([
        { id: editing.id, name: 'Editing', projects: [] },
        {
          id: writing.id,
          name: 'Writing',
          projects: [{ id: project.id, name: `Blog ${RUN}` }],
        },
      ]);
    });
  });

  describe('archive impact', () => {
    it('lists the active projects that offer the activity now', async () => {
      const { id } = await activities.create(
        { name: 'Research', categoryId },
        companyId,
      );

      await createProject('Zephyr', id);
      await createProject('Atlas', id);
      await createProject('Removed from', id, { linkActive: false });
      await createProject('Archived', id, { status: ProjectStatus.ARCHIVED });

      const { projects } = await activities.getArchiveImpact(id, companyId);

      expect(projects.map((project) => project.name)).toEqual([
        `Atlas ${RUN}`,
        `Zephyr ${RUN}`,
      ]);
    });
  });
  describe('lists', () => {
    const searchFor = (search: string) =>
      ({ offset: 0, limit: 50, search }) as never;

    let listedId: string;

    beforeAll(async () => {
      listedId = (
        await activities.create({ name: 'Listed Work', categoryId }, companyId)
      ).id;

      await createProject('Listing one', listedId);
      await createProject('Listing two', listedId);
      await createProject('Listing removed', listedId, { linkActive: false });
      await createProject('Listing archived', listedId, {
        status: ProjectStatus.ARCHIVED,
      });
    });

    it('finds an activity by part of its name, ignoring case', async () => {
      const { results } = await activities.list(
        callerWith(UserRole.OWNER),
        searchFor('LISTED'),
      );

      expect(results.map((activity) => activity.id)).toEqual([listedId]);
    });

    it('counts the active projects that offer each activity', async () => {
      const { results } = await activities.list(
        callerWith(UserRole.MANAGER),
        searchFor('Listed Work'),
      );

      expect(results[0]).toMatchObject({ id: listedId, projectsCount: 2 });
    });

    it('gives an employee no project count', async () => {
      const { results } = await activities.list(
        callerWith(UserRole.EMPLOYEE),
        searchFor('Listed Work'),
      );

      expect(results[0]).not.toHaveProperty('projectsCount');
    });

    it('counts the active activities in each category', async () => {
      const counted = await categories.create(
        { name: `Counted ${RUN}` },
        companyId,
      );
      await activities.create(
        { name: 'Counted one', categoryId: counted.id },
        companyId,
      );
      const archived = await activities.create(
        { name: 'Counted archived', categoryId: counted.id },
        companyId,
      );
      await activities.archive(archived.id, companyId);

      const { results } = await categories.list(
        callerWith(UserRole.MANAGER),
        searchFor('counted'),
      );

      expect(results).toEqual([
        expect.objectContaining({ id: counted.id, activitiesCount: 1 }),
      ]);
    });

    it('reads % and _ as plain characters in a search', async () => {
      const owner = callerWith(UserRole.OWNER);
      const namesFound = async (search: string) =>
        (await activities.list(owner, searchFor(search))).results.map(
          (activity) => activity.name,
        );

      expect(await namesFound('B%c')).toEqual(['B%c']);
      expect(await namesFound('B_c')).toEqual(['B_c']);
      expect(
        (await categories.list(owner, searchFor('Deliver_'))).results,
      ).toEqual([]);
    });
  });
});
