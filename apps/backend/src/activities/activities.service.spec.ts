import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
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

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    categories = new ActCategoriesService(
      dataSource.getRepository(ActCategory),
    );
    activities = new ActivitiesService(
      dataSource.getRepository(Activity),
      categories,
      dataSource.getRepository(ProjectActivity),
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

  describe('archive impact', () => {
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
});
