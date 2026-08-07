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
import { AccessGuard, RolesGuard } from 'src/auth/guards';
import { ActCategoriesService } from './activity-categories.service';
import { Serialize, SerializeList } from 'src/lib/interceptors';
import { CurrentUser, Role } from 'src/lib/decorators';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { ActivityCategoryResponse } from './dtos/ActivitiesCategoryResponse.dto';
import { ActivityCategoryPayload } from './dtos/ActivitiesCategoryPayload.dto';
import { ActivityCategoriesQuery } from './dtos/ActivitiesCategoriesQuery.dto';
import { UserRole } from 'src/users/enums/UserRole.enum';

@Controller('activity-categories')
@UseGuards(AccessGuard, RolesGuard)
export class ActCategoriesController {
  constructor(private readonly service: ActCategoriesService) {}

  @Get()
  @SerializeList(ActivityCategoryResponse)
  list(@Query() query: ActivityCategoriesQuery, @CurrentUser() user: AuthUser) {
    return this.service.list(user, query);
  }

  @Get(':id')
  @Serialize(ActivityCategoryResponse)
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getById(id, user.companyId);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Post()
  @Serialize(ActivityCategoryResponse)
  create(
    @Body() payload: ActivityCategoryPayload,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(payload, user.companyId);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id')
  @Serialize(ActivityCategoryResponse)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: ActivityCategoryPayload,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, payload, user.companyId);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/archive')
  @Serialize(ActivityCategoryResponse)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.archive(id, user.companyId);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/unarchive')
  @Serialize(ActivityCategoryResponse)
  unarchive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.unarchive(id, user.companyId);
  }
}
