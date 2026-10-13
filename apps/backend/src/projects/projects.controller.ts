import {
  Body,
  Controller,
  Delete,
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
} from './dtos/project-payload.dto';
import {
  ProjectListItemResponse,
  ProjectResponse,
} from './dtos/project-response.dto';
import { Serialize, SerializeList } from 'src/lib/interceptors';
import { AccessGuard, RolesGuard } from 'src/auth/guards';
import { CurrentUser, Role } from 'src/lib/decorators';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import {
  ProjectActivityResponse,
  ProjectSummaryResponse,
} from './dtos/project-activity-response.dto';
import { ProjectsQuery } from './dtos/projects-query.dto';
import { PaginationQuery } from 'src/lib/dtos/pagination-query.dto';
import { AssignableActivitiesQuery } from './dtos/assignable-activities-query.dto';
import { AssignableUserResponse } from 'src/users/dtos/assignable-user-response.dto';

@Controller('projects')
@UseGuards(AccessGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Get()
  @SerializeList(ProjectListItemResponse)
  getAll(@Query() query: ProjectsQuery, @CurrentUser() user: AuthUser) {
    return this.service.list(query, user);
  }

  @Get('me')
  @SerializeList(ProjectSummaryResponse)
  listOwnProjects(@CurrentUser() user: AuthUser) {
    return this.service.listOwnProjects(user);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
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

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Post(':id/members/:userId')
  @Serialize(ProjectResponse)
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addMember(id, userId, user);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Delete(':id/members/:userId')
  @Serialize(ProjectResponse)
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeMember(id, userId, user);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Post(':id/activities/:activityId')
  @Serialize(ProjectResponse)
  addActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addActivity(id, activityId, user);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Delete(':id/activities/:activityId')
  @Serialize(ProjectResponse)
  removeActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeActivity(id, activityId, user);
  }

  // Open to everyone: employees need it for the timesheet picker, and it only
  // returns their own projects.
  @Get('me/activities')
  @SerializeList(ProjectActivityResponse)
  listAssignableActivities(
    @Query() query: AssignableActivitiesQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.listAssignableActivities(query, user);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Get(':id/users')
  @SerializeList(AssignableUserResponse)
  listUsers(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query() query: PaginationQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.listUsers(projectId, query, user);
  }
}
