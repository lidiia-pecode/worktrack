import 'reflect-metadata';
import { AppDataSource } from 'src/data-source';
import { seedCompanies } from './seed-companies';
import { seedUsers } from './seed-users';
import { seedActivityCategories } from './seed-activity-categories';
import { seedActivities } from './seed-activities';
import { seedProjects } from './seed-projects';
import { seedProjectActivities } from './seed-project-activities';
import { seedTeams } from './seed-teams';
import { seedReportingPeriods } from './seed-reporting-periods';
import { seedPlanning } from './seed-planning';

async function run() {
  try {
    console.log('🌱 Starting Seeding Process via TypeORM Repositories...');
    await AppDataSource.initialize();

    const companyId = await seedCompanies(AppDataSource);
    await seedUsers(AppDataSource, companyId);
    await seedActivityCategories(AppDataSource, companyId);
    await seedActivities(AppDataSource, companyId);
    await seedProjects(AppDataSource, companyId);
    await seedProjectActivities(AppDataSource, companyId);
    await seedTeams(AppDataSource, companyId);
    await seedPlanning(AppDataSource, companyId);
    await seedReportingPeriods(AppDataSource, companyId);

    console.log('🚀 All Seeds Executed Successfully!');
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

run();
