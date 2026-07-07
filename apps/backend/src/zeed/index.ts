import { AppDataSource } from 'src/data-source';
import { seedUsers } from './seed-users';
import { seedActivityCategories } from './seed-activity-categories';
import { seedActivities } from './seed-activities';
import { seedProjects } from './seed-projects';
import { seedProjectActivities } from './seed-project-activities';
import { seedAdmin } from './seed-admin';

async function run() {
  await AppDataSource.initialize();

  try {
    console.log('🌱 Starting database seeding...\n');
    await seedAdmin(AppDataSource);
    await seedUsers(AppDataSource);
    await seedActivityCategories(AppDataSource);
    await seedActivities(AppDataSource);
    await seedProjects(AppDataSource);
    await seedProjectActivities(AppDataSource);

    console.log('\n✅ Database seeded successfully');
  } catch (error) {
    console.error('\n❌ Seeding failed');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await AppDataSource.destroy();
  }
}

void run();
