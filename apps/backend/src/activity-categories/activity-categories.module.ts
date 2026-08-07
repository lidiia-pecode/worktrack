import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActCategory } from './entities/activities-category.entity';
import { ActCategoriesService } from './activity-categories.service';
import { ActCategoriesController } from './activity-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ActCategory])],
  controllers: [ActCategoriesController],
  providers: [ActCategoriesService],
  exports: [ActCategoriesService],
})
export class ActCategoriesModule {}
