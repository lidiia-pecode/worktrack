import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Raw, Repository } from 'typeorm';
import { Team, TeamStatus } from './entities/team.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import {
  AddTeamMemberDto,
  CreateTeamDto,
  TeamsQuery,
  UpdateTeamDto,
  UpdateTeamMemberDto,
} from './dtos/team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(TeamMembership)
    private readonly membershipRepo: Repository<TeamMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ==========================================
  // TEAMS CRUD
  // ==========================================

  async list(companyId: string, query: TeamsQuery) {
    const where = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [results, count] = await this.teamRepo.findAndCount({
      where,
      relations: ['memberships', 'memberships.user'],
      skip: query.offset,
      take: query.limit,
      order: { name: 'ASC' },
    });

    // only active members
    results.forEach((team) => {
      if (team.memberships) {
        team.memberships = team.memberships.filter((m) => m.leftAt === null);
      }
    });

    return { results, count };
  }

  async getTeamById(id: string, companyId: string): Promise<Team> {
    const team = await this.teamRepo.findOne({
      where: { id, companyId },
      relations: ['memberships', 'memberships.user'],
    });

    if (!team) {
      throw new NotFoundException(
        `Team with id ${id} not found in this company`,
      );
    }

    return team;
  }

  async createTeam(companyId: string, dto: CreateTeamDto): Promise<Team> {
    const existing = await this.teamRepo.findOne({
      where: { companyId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Team with name "${dto.name}" already exists`,
      );
    }

    const team = this.teamRepo.create({
      companyId,
      name: dto.name,
      status: TeamStatus.ACTIVE,
    });

    return this.teamRepo.save(team);
  }

  async updateTeam(
    id: string,
    companyId: string,
    dto: UpdateTeamDto,
  ): Promise<Team> {
    const team = await this.getTeamById(id, companyId);

    if (dto.name && dto.name !== team.name) {
      const duplicate = await this.teamRepo.findOne({
        where: { companyId, name: dto.name },
      });

      if (duplicate) {
        throw new ConflictException(
          `Team with name "${dto.name}" already exists`,
        );
      }
      team.name = dto.name;
    }

    if (dto.status !== undefined) {
      team.status = dto.status;
    }

    return this.teamRepo.save(team);
  }

  async archiveTeam(id: string, companyId: string): Promise<Team> {
    const team = await this.getTeamById(id, companyId);

    if (team.status === TeamStatus.ARCHIVED) {
      throw new BadRequestException('Team is already archived');
    }

    team.status = TeamStatus.ARCHIVED;
    return this.teamRepo.save(team);
  }

  async unarchiveTeam(id: string, companyId: string): Promise<Team> {
    const team = await this.getTeamById(id, companyId);

    if (team.status === TeamStatus.ACTIVE) {
      throw new BadRequestException('Team is already active');
    }

    team.status = TeamStatus.ACTIVE;
    return this.teamRepo.save(team);
  }

  // ==========================================
  // TEAM MEMBERSHIPS MANAGEMENT
  // ==========================================

  async addMember(
    teamId: string,
    companyId: string,
    dto: AddTeamMemberDto,
  ): Promise<TeamMembership> {
    // 1. Перевіряємо існування команди у тенанті
    await this.getTeamById(teamId, companyId);

    // 2. Перевіряємо існування юзера у ТОМУ Ж ТЕНАНТІ
    const user = await this.userRepo.findOne({
      where: { id: dto.userId, companyId },
    });

    if (!user) {
      throw new NotFoundException(
        `User with id ${dto.userId} not found in this company`,
      );
    }

    // 3. Валідація дат (leftAt >= joinedAt)
    if (dto.leftAt && dto.leftAt < dto.joinedAt) {
      throw new BadRequestException('leftAt cannot be earlier than joinedAt');
    }

    // 4. Перевірка активного членства (запобігання дублікатам без leftAt)
    const activeMembership = await this.membershipRepo.findOne({
      where: [
        { teamId, userId: dto.userId, leftAt: IsNull() },
        ...(dto.leftAt
          ? [
              {
                teamId,
                userId: dto.userId,
                joinedAt: Raw((alias) => `${alias} <= :leftAt`, {
                  leftAt: dto.leftAt,
                }),
                leftAt: Raw((alias) => `${alias} >= :joinedAt`, {
                  joinedAt: dto.joinedAt,
                }),
              },
            ]
          : []),
      ],
    });

    if (activeMembership) {
      throw new ConflictException(
        'User already has an active or overlapping membership in this team',
      );
    }

    const membership = this.membershipRepo.create({
      companyId,
      teamId,
      userId: dto.userId,
      roleInTeam: dto.roleInTeam,
      joinedAt: dto.joinedAt,
      leftAt: dto.leftAt ?? null,
    });

    const saved = await this.membershipRepo.save(membership);

    return this.membershipRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['user'],
    });
  }

  async updateMember(
    membershipId: string,
    companyId: string,
    dto: UpdateTeamMemberDto,
  ): Promise<TeamMembership> {
    const membership = await this.membershipRepo.findOne({
      where: { id: membershipId, companyId },
      relations: ['user'],
    });

    if (!membership) {
      throw new NotFoundException(
        `Team membership with id ${membershipId} not found`,
      );
    }

    const newJoinedAt = dto.joinedAt ?? membership.joinedAt;
    const newLeftAt = dto.leftAt !== undefined ? dto.leftAt : membership.leftAt;

    if (newLeftAt && newLeftAt < newJoinedAt) {
      throw new BadRequestException('leftAt cannot be earlier than joinedAt');
    }

    // Перевірка перетину дат з ІНШИМИ членствами цього ж користувача
    if (dto.joinedAt !== undefined || dto.leftAt !== undefined) {
      const overlapping = await this.membershipRepo.findOne({
        where: [
          {
            teamId: membership.teamId,
            userId: membership.userId,
            id: Not(membershipId),
            leftAt: IsNull(),
          },
          ...(newLeftAt
            ? [
                {
                  teamId: membership.teamId,
                  userId: membership.userId,
                  id: Not(membershipId),
                  joinedAt: Raw((alias) => `${alias} <= :leftAt`, {
                    leftAt: newLeftAt,
                  }),
                  leftAt: Raw((alias) => `${alias} >= :joinedAt`, {
                    joinedAt: newJoinedAt,
                  }),
                },
              ]
            : []),
        ],
      });

      if (overlapping) {
        throw new ConflictException(
          'Updated dates overlap with another existing membership interval',
        );
      }
    }

    if (dto.roleInTeam !== undefined) membership.roleInTeam = dto.roleInTeam;
    if (dto.joinedAt !== undefined) membership.joinedAt = dto.joinedAt;
    if (dto.leftAt !== undefined) membership.leftAt = dto.leftAt;

    await this.membershipRepo.save(membership);

    return this.membershipRepo.findOneOrFail({
      where: { id: membershipId },
      relations: ['user'],
    });
  }

  async removeMember(membershipId: string, companyId: string): Promise<void> {
    const membership = await this.membershipRepo.findOne({
      where: { id: membershipId, companyId },
    });

    if (!membership) {
      throw new NotFoundException(
        `Team membership with id ${membershipId} not found`,
      );
    }

    await this.membershipRepo.remove(membership);
  }
}
