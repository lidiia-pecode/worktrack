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
import { RolesGuard } from 'src/auth/guards/RolesGuard';
import { Role } from 'src/lib/decorators';
import { Serialize, SerializeList } from 'src/lib/interceptors';
import { ActivitiesService } from './activities.service';
import { ActivityPayload } from './dtos/ActivityPayload.dto';
import { ActivityResponse } from './dtos/ActivityResponse.dto';
import { UserRole } from 'src/users/enums/UserRole.enum';
import { ActivitiesQuery } from './dtos/ActivitiesQuery.dto';

@Controller('activities')
@UseGuards(AccessGuard, RolesGuard)
@Role(UserRole.MANAGER, UserRole.SUPER_ADMIN)
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get()
  @SerializeList(ActivityResponse)
  list(@Query() query: ActivitiesQuery) {
    return this.service.list(query);
  }

  @Get(':id')
  @Serialize(ActivityResponse)
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Post()
  @Serialize(ActivityResponse)
  create(@Body() payload: ActivityPayload) {
    return this.service.create(payload);
  }

  @Patch(':id')
  @Serialize(ActivityResponse)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: ActivityPayload,
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
