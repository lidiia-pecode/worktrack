import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';

import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationsService } from './notifications.service';

/**
 * The clean-up is a SQL delete, so this runs against the development database:
 * `make test`. Everything is created under a throwaway company.
 */

const RUN = Date.now();
const SLUG = `notifications-test-${RUN}`;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(Date.now() - days * MS_PER_DAY);

describe('NotificationsService clean-up', () => {
  let dataSource: DataSource;
  let service: NotificationsService;
  let companyId: string;
  let recipientId: string;

  const notification = (readAt: Date | null) =>
    dataSource.getRepository(Notification).save({
      companyId,
      recipientId,
      type: NotificationType.INVITATION_ACCEPTED,
      readAt,
    });

  const exists = (id: string) =>
    dataSource.getRepository(Notification).existsBy({ id });

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });
    companyId = company.id;

    const recipient = await dataSource.getRepository(User).save({
      companyId,
      role: UserRole.OWNER,
      firstName: 'Grace',
      lastName: 'Walker',
      email: `grace-${RUN}@notifications.test`,
      status: UserStatus.ACTIVE,
    });
    recipientId = recipient.id;

    service = new NotificationsService(dataSource.getRepository(Notification));
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.getRepository(Company).delete({ slug: SLUG });
    await dataSource.destroy();
  });

  it('deletes notifications read over 60 days ago and keeps the rest', async () => {
    const readLongAgo = await notification(daysAgo(61));
    const readRecently = await notification(daysAgo(59));
    const unread = await notification(null);
    await dataSource
      .getRepository(Notification)
      .update(unread.id, { createdAt: daysAgo(400) });

    await service.deleteOldReadNotifications();

    expect(await exists(readLongAgo.id)).toBe(false);
    expect(await exists(readRecently.id)).toBe(true);
    expect(await exists(unread.id)).toBe(true);
  });
});
