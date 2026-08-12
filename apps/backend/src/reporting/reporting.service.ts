import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRole } from 'src/users/enums/UserRole.enum';
import { ReportingPeriod } from './entities/reporting-period.entity';
import { ReportingPeriodStatus } from './enum/reporting-period-status.enum';
import {
  CreateReportingPeriodDto,
  UpdateReportingPeriodDto,
} from './dtos/reporting-period.dto';
import { AuthUser } from 'src/auth/auth-strategies/types';
import { GetReportQueryDto } from './dtos/report-query.dto';

interface PlannedRawResult {
  userId: string;
  totalPlannedMinutes: string | number | null;
}

interface ActualRawResult {
  userId: string;
  totalActualMinutes: string | number | null;
  billableMinutes: string | number | null;
}

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(ReportingPeriod)
    private readonly periodRepo: Repository<ReportingPeriod>,
  ) {}

  // ==========================================
  // REPORTING PERIODS MANAGEMENT
  // ==========================================

  async createPeriod(
    companyId: string,
    dto: CreateReportingPeriodDto,
  ): Promise<ReportingPeriod> {
    if (new Date(dto.startDate) > new Date(dto.endDate)) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    const existingName = await this.periodRepo.findOne({
      where: { companyId, name: dto.name },
    });
    if (existingName) {
      throw new ConflictException(
        `Reporting period with name "${dto.name}" already exists`,
      );
    }

    const period = this.periodRepo.create({
      ...dto,
      companyId,
    });

    return this.periodRepo.save(period);
  }

  async findAllPeriods(companyId: string): Promise<ReportingPeriod[]> {
    return this.periodRepo.find({
      where: { companyId },
      order: { startDate: 'DESC' },
    });
  }

  async updatePeriod(
    companyId: string,
    id: string,
    dto: UpdateReportingPeriodDto,
  ): Promise<ReportingPeriod> {
    const period = await this.periodRepo.findOne({ where: { id, companyId } });
    if (!period) {
      throw new NotFoundException('Reporting period not found');
    }

    if (dto.name && dto.name !== period.name) {
      const existingName = await this.periodRepo.findOne({
        where: { companyId, name: dto.name },
      });
      if (existingName) {
        throw new ConflictException(
          `Reporting period with name "${dto.name}" already exists`,
        );
      }
    }

    const startDate = dto.startDate ?? period.startDate;
    const endDate = dto.endDate ?? period.endDate;

    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    Object.assign(period, dto);
    return this.periodRepo.save(period);
  }

  async isDateLocked(companyId: string, date: string): Promise<boolean> {
    const lockedPeriod = await this.periodRepo
      .createQueryBuilder('rp')
      .where('rp.companyId = :companyId', { companyId })
      .andWhere('rp.status = :status', { status: ReportingPeriodStatus.LOCKED })
      .andWhere(':date BETWEEN rp.startDate AND rp.endDate', { date })
      .getOne();

    return !!lockedPeriod;
  }

  // ==========================================
  // ANALYTICS & REPORTS
  // ==========================================

  async getPlannedVsActualReport(user: AuthUser, query: GetReportQueryDto) {
    const { companyId, role } = user;
    const { startDate, endDate, userId, projectId } = query;

    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    let targetUserId = userId;

    // RBAC Scope Verification
    if (role === UserRole.EMPLOYEE) {
      targetUserId = user.id; // Employee sees only own analytics
    } else if (role === UserRole.MANAGER && userId && userId !== user.id) {
      // TODO: Add TeamMembership check that targetUserId is in Manager's active team
    }

    // 1. Aggregate Planned Minutes
    const plannedQuery = this.periodRepo.manager
      .createQueryBuilder()
      .select('pe.user_id', 'userId')
      .addSelect('SUM(pe.planned_minutes)', 'totalPlannedMinutes')
      .from('planning_entries', 'pe')
      .innerJoin('project_activities', 'pa', 'pa.id = pe.project_activity_id')
      .where('pe.company_id = :companyId', { companyId })
      .andWhere('pe.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (targetUserId)
      plannedQuery.andWhere('pe.user_id = :targetUserId', { targetUserId });
    if (projectId)
      plannedQuery.andWhere('pa.project_id = :projectId', { projectId });

    // 👈 Явно вказуємо тип повертаного значення generic-параметром
    const plannedResult = await plannedQuery
      .groupBy('pe.user_id')
      .getRawMany<PlannedRawResult>();

    // 2. Aggregate Actual Logged Minutes
    const actualQuery = this.periodRepo.manager
      .createQueryBuilder()
      .select('tl.user_id', 'userId')
      .addSelect('SUM(tl.minutes)', 'totalActualMinutes')
      .addSelect(
        'SUM(CASE WHEN tl.is_billable = true THEN tl.minutes ELSE 0 END)',
        'billableMinutes',
      )
      .from('time_logs', 'tl')
      .innerJoin('project_activities', 'pa', 'pa.id = tl.project_activity_id')
      .where('tl.company_id = :companyId', { companyId })
      .andWhere('tl.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (targetUserId)
      actualQuery.andWhere('tl.user_id = :targetUserId', { targetUserId });
    if (projectId)
      actualQuery.andWhere('pa.project_id = :projectId', { projectId });

    // 👈 Явно вказуємо тип повертаного значення generic-параметром
    const actualResult = await actualQuery
      .groupBy('tl.user_id')
      .getRawMany<ActualRawResult>();

    // 3. Merge Datasets
    const map = new Map<
      string,
      {
        userId: string;
        plannedMinutes: number;
        actualMinutes: number;
        billableMinutes: number;
      }
    >();

    plannedResult.forEach((p) => {
      map.set(p.userId, {
        userId: p.userId,
        plannedMinutes: Number(p.totalPlannedMinutes) || 0,
        actualMinutes: 0,
        billableMinutes: 0,
      });
    });

    actualResult.forEach((a) => {
      const existing = map.get(a.userId) || {
        userId: a.userId,
        plannedMinutes: 0,
        actualMinutes: 0,
        billableMinutes: 0,
      };
      existing.actualMinutes = Number(a.totalActualMinutes) || 0;
      existing.billableMinutes = Number(a.billableMinutes) || 0;
      map.set(a.userId, existing);
    });

    return Array.from(map.values()).map((row) => ({
      ...row,
      plannedHours: Number((row.plannedMinutes / 60).toFixed(2)),
      actualHours: Number((row.actualMinutes / 60).toFixed(2)),
      billableHours: Number((row.billableMinutes / 60).toFixed(2)),
      billableRatio:
        row.actualMinutes > 0
          ? Number(((row.billableMinutes / row.actualMinutes) * 100).toFixed(1))
          : 0,
      varianceHours: Number(
        ((row.actualMinutes - row.plannedMinutes) / 60).toFixed(2),
      ),
    }));
  }
}
