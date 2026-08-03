import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessGuard } from 'src/auth/guards';
import { ActCategoriesService } from './activity-categories.service';
import { Serialize, SerializeList } from 'src/lib/interceptors';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { CurrentUser, Role } from 'src/lib/decorators';
import { User } from 'src/users/entities/user.entity';
import { ActivityCategoryResponse } from './dtos/ActivitiesCategoryResponse.dto';
import { RolesGuard } from 'src/auth/guards/RolesGuard';
import { ActivityCategoryPayload } from './dtos/ActivitiesCategoryPayload.dto';
import { UserRole } from 'src/users/enums/UserRole.enum';

@Controller('activity-categories')
@UseGuards(AccessGuard, RolesGuard)
@Role(UserRole.MANAGER, UserRole.SUPER_ADMIN)
export class ActCategoriesController {
  constructor(private readonly service: ActCategoriesService) {}

  @Get()
  @SerializeList(ActivityCategoryResponse)
  list(@Query() pagination: PaginationQuery, @CurrentUser() user: User) {
    return this.service.list(user, pagination);
  }

  @Get(':id')
  @Serialize(ActivityCategoryResponse)
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Post()
  @Serialize(ActivityCategoryResponse)
  create(@Body() payload: ActivityCategoryPayload) {
    return this.service.create(payload);
  }

  @Patch(':id')
  @Serialize(ActivityCategoryResponse)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: ActivityCategoryPayload,
  ) {
    return this.service.update(id, payload);
  }

  @Patch(':id/archive')
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.archive(id);
  }

  @Patch(':id/unarchive')
  unarchive(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.unarchive(id);
  }
}
