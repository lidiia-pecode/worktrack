import 'reflect-metadata';
import { AppDataSource } from 'src/data-source';

import { COMPANY, OWNER_EMAIL, SEED_PASSWORD } from './seed-config';
import { seedCompanies } from './seed-companies';
import { seedUsers } from './seed-users';
import { seedActivityCategories } from './seed-activity-categories';
import { seedActivities } from './seed-activities';
import { seedProjects } from './seed-projects';
import { seedProjectActivities } from './seed-project-activities';
import { seedTeams } from './seed-teams';
import { seedPlanning } from './seed-planning';
import { seedTimeLogs } from './seed-time-logs';
import { seedReportingPeriods } from './seed-reporting-periods';
import { writeCredentialsFile } from './write-credentials';

async function run() {
  try {
    console.log(`🌱 Seeding "${COMPANY.companyName}"...`);
    await AppDataSource.initialize();

    const companyId = await seedCompanies(AppDataSource);

    await seedUsers(AppDataSource, companyId);
    await seedActivityCategories(AppDataSource, companyId);
    await seedActivities(AppDataSource, companyId);
    await seedProjects(AppDataSource, companyId);
    await seedProjectActivities(AppDataSource, companyId);
    await seedTeams(AppDataSource, companyId);
    await seedPlanning(AppDataSource, companyId);
    await seedTimeLogs(AppDataSource, companyId);
    await seedReportingPeriods(AppDataSource, companyId);

    const file = writeCredentialsFile();

    console.log('\n🚀 Done.');
    console.log(`   Owner:    ${OWNER_EMAIL}`);
    console.log(`   Password: ${SEED_PASSWORD}`);
    console.log(`   All logins: ${file}\n`);
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void run();
