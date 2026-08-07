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
import { CurrentUser, Role } from 'src/lib/decorators';
import { Serialize, SerializeList } from 'src/lib/interceptors';
import { ActivitiesService } from './activities.service';
import {
  ActivityPayload,
  UpdateActivityPayload,
} from './dtos/ActivityPayload.dto';
import { ActivityResponse } from './dtos/ActivityResponse.dto';
import { ActivitiesQuery } from './dtos/ActivitiesQuery.dto';
import { UserRole } from 'src/users/enums/UserRole.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Controller('activities')
@UseGuards(AccessGuard, RolesGuard)
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get()
  @SerializeList(ActivityResponse)
  list(@Query() query: ActivitiesQuery, @CurrentUser() user: AuthUser) {
    return this.service.list(user, query);
  }

  @Get(':id')
  @Serialize(ActivityResponse)
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getById(id, user.companyId);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Post()
  @Serialize(ActivityResponse)
  create(@Body() payload: ActivityPayload, @CurrentUser() user: AuthUser) {
    return this.service.create(payload, user.companyId);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id')
  @Serialize(ActivityResponse)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateActivityPayload,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, payload, user.companyId);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/archive')
  @Serialize(ActivityResponse)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.archive(id, user.companyId);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/unarchive')
  @Serialize(ActivityResponse)
  unarchive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.unarchive(id, user.companyId);
  }
}
