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
import { ProjectsService } from './projects.service';
import {
  ProjectPayload,
  UpdateProjectPayload,
} from './dtos/ProjectPayload.dto';
import { ProjectResponse } from './dtos/ProjectResponse.dto';
import { Serialize, SerializeList } from 'src/lib/interceptors';
import { AccessGuard, RolesGuard } from 'src/auth/guards';
import { CurrentUser, Role } from 'src/lib/decorators';
import { UserRole } from 'src/users/enums/UserRole.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { ProjectActivityResponse } from './dtos/ProjectActivityResponse.dto';
import { ProjectsQuery } from './dtos/ProjectsQuery.dto';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { UserResponse } from 'src/users/dtos/UserResponse.dto';

@Controller('projects')
@UseGuards(AccessGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  @SerializeList(ProjectResponse)
  getAll(@Query() query: ProjectsQuery, @CurrentUser() user: AuthUser) {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Serialize(ProjectResponse)
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getById(id, user);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Post()
  @Serialize(ProjectResponse)
  create(@Body() payload: ProjectPayload, @CurrentUser() user: AuthUser) {
    return this.service.create(payload, user);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id')
  @Serialize(ProjectResponse)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateProjectPayload,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, payload, user);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/archive')
  @Serialize(ProjectResponse)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.archive(id, user);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/unarchive')
  @Serialize(ProjectResponse)
  unarchive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.unarchive(id, user);
  }

  @Get(':id/activities')
  @SerializeList(ProjectActivityResponse)
  listActivities(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query() query: PaginationQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.listActivities(projectId, query, user);
  }

  @Get(':id/users')
  @SerializeList(UserResponse)
  listUsers(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query() query: PaginationQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.listUsers(projectId, query, user);
  }
}
