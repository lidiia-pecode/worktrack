import 'reflect-metadata';
import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';

import { GoogleLinkToken } from '../entities/google-link-token.entity';
import { GoogleSignupToken } from '../entities/google-signup-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { AuthCleanupService } from './auth-cleanup.service';

/**
 * The clean-up is a set of SQL deletes, so these run against the development
 * database: `make test`. Everything is created under a throwaway company.
 */

const RUN = Date.now();
const SLUG = `auth-cleanup-test-${RUN}`;
const HOUR_MS = 3_600_000;

const stub = <T>(value: unknown): T => value as T;

type TokenState = 'used' | 'expired' | 'valid';

const timestampsFor = (state: TokenState) => ({
  usedAt: state === 'used' ? new Date() : null,
  expiresAt: new Date(Date.now() + (state === 'expired' ? -HOUR_MS : HOUR_MS)),
});

const uniqueHash = () => randomBytes(32).toString('hex');

describe('AuthCleanupService', () => {
  let dataSource: DataSource;
  let service: AuthCleanupService;
  let userId: string;

  const createTokens = async (state: TokenState) => {
    const timestamps = timestampsFor(state);

    const signup = await dataSource.getRepository(GoogleSignupToken).save({
      ...timestamps,
      tokenHash: uniqueHash(),
      email: `${state}-${RUN}@auth-cleanup.test`,
      firstName: 'Signup',
      lastName: 'Test',
      googleId: `google-${state}-${RUN}`,
    });
    const link = await dataSource.getRepository(GoogleLinkToken).save({
      ...timestamps,
      tokenHash: uniqueHash(),
      userId,
      googleId: `google-${state}-${RUN}`,
    });
    const reset = await dataSource.getRepository(PasswordResetToken).save({
      ...timestamps,
      usedAt: timestamps.usedAt ?? undefined,
      tokenHash: uniqueHash(),
      userId,
    });

    return { signup: signup.id, link: link.id, reset: reset.id };
  };

  const stillExist = async (ids: Awaited<ReturnType<typeof createTokens>>) => ({
    signup: await dataSource
      .getRepository(GoogleSignupToken)
      .existsBy({ id: ids.signup }),
    link: await dataSource
      .getRepository(GoogleLinkToken)
      .existsBy({ id: ids.link }),
    reset: await dataSource
      .getRepository(PasswordResetToken)
      .existsBy({ id: ids.reset }),
  });

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });

    const user = await dataSource.getRepository(User).save({
      companyId: company.id,
      role: UserRole.OWNER,
      firstName: 'Owner',
      lastName: 'Test',
      email: `owner-${RUN}@auth-cleanup.test`,
      status: UserStatus.ACTIVE,
    });
    userId = user.id;

    service = new AuthCleanupService(
      stub({ deleteExpiredSessions: jest.fn().mockResolvedValue(0) }),
      dataSource,
    );
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.getRepository(Company).delete({ slug: SLUG });

    await dataSource.destroy();
  });

  it('deletes used and expired one-time tokens and keeps valid ones', async () => {
    const used = await createTokens('used');
    const expired = await createTokens('expired');
    const valid = await createTokens('valid');

    await service.handleCron();

    const none = { signup: false, link: false, reset: false };
    expect(await stillExist(used)).toEqual(none);
    expect(await stillExist(expired)).toEqual(none);
    expect(await stillExist(valid)).toEqual({
      signup: true,
      link: true,
      reset: true,
    });

    // Google tokens are not tied to a company, so they are removed here.
    await dataSource.getRepository(GoogleSignupToken).delete(valid.signup);
    await dataSource.getRepository(GoogleLinkToken).delete(valid.link);
  });
});
