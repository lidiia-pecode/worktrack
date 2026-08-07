import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import {
  AddTeamMemberDto,
  CreateTeamDto,
  TeamsQuery,
  UpdateTeamDto,
  UpdateTeamMemberDto,
} from './dtos/team.dto';
import { TeamMembershipResponse, TeamResponse } from './dtos/team-response.dto';
import { Serialize, SerializeList } from 'src/lib/interceptors';
import { CurrentUser, Role } from 'src/lib/decorators';
import { AccessGuard, RolesGuard } from 'src/auth/guards';
import { UserRole } from 'src/users/enums/UserRole.enum';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { Team } from './entities/team.entity';
import { TeamMembership } from './entities/team-membership.entity';

@Controller('teams')
@UseGuards(AccessGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @SerializeList(TeamResponse)
  async list(@CurrentUser() authUser: AuthUser, @Query() query: TeamsQuery) {
    return this.teamsService.list(authUser.companyId, query);
  }

  @Get(':id')
  @Serialize(TeamResponse)
  async getTeamById(
    @CurrentUser() authUser: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Team> {
    return this.teamsService.getTeamById(id, authUser.companyId);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Post()
  @Serialize(TeamResponse)
  async createTeam(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: CreateTeamDto,
  ): Promise<Team> {
    return this.teamsService.createTeam(authUser.companyId, dto);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id')
  @Serialize(TeamResponse)
  async updateTeam(
    @CurrentUser() authUser: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
  ): Promise<Team> {
    return this.teamsService.updateTeam(id, authUser.companyId, dto);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/archive')
  @Serialize(TeamResponse)
  async archiveTeam(
    @CurrentUser() authUser: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Team> {
    return this.teamsService.archiveTeam(id, authUser.companyId);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/unarchive')
  @Serialize(TeamResponse)
  async unarchiveTeam(
    @CurrentUser() authUser: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Team> {
    return this.teamsService.unarchiveTeam(id, authUser.companyId);
  }

  // ==========================================
  // MEMBERSHIPS ENDPOINTS (UNIFIED REST)
  // ==========================================

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Post(':id/members')
  @Serialize(TeamMembershipResponse)
  async addMember(
    @CurrentUser() authUser: AuthUser,
    @Param('id', ParseUUIDPipe) teamId: string,
    @Body() dto: AddTeamMemberDto,
  ): Promise<TeamMembership> {
    return this.teamsService.addMember(teamId, authUser.companyId, dto);
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/members/:membershipId')
  @Serialize(TeamMembershipResponse)
  async updateMember(
    @CurrentUser() authUser: AuthUser,
    @Param('id', ParseUUIDPipe) teamId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: UpdateTeamMemberDto,
  ): Promise<TeamMembership> {
    return this.teamsService.updateMember(
      membershipId,
      authUser.companyId,
      dto,
      teamId,
    );
  }

  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Delete(':id/members/:membershipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentUser() authUser: AuthUser,
    @Param('id', ParseUUIDPipe) teamId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ): Promise<void> {
    await this.teamsService.removeMember(
      membershipId,
      authUser.companyId,
      teamId,
    );
  }
}
