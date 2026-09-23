import { Injectable } from '@nestjs/common';

import type { AuthUser } from 'src/auth/auth-strategies/types';
import {
  Availability,
  ExpectedHoursService,
} from 'src/capacity/expected-hours.service';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';

import { HoursReportGroupBy } from '../enums/hours-report-group-by.enum';
import { HoursReportRow, ReportingService } from '../reporting.service';
import { UtilisationQuery } from './dtos/utilisation-query.dto';

export interface UtilisationFigures extends Availability {
  loggedMinutes: number;
  billableMinutes: number;
  /** Billable and non-billable client work together. */
  clientMinutes: number;
  nonBillableClientMinutes: number;
  /** Billable ÷ available. Null when nothing was available. */
  billableUtilisation: number | null;
  /** Client ÷ logged. Null when nothing was logged. */
  clientShare: number | null;
  /** Non-billable client ÷ client. Null when there was no client work. */
  nonBillableClientShare: number | null;
  /** Logged ÷ expected, where expected is the available figure. */
  loggingCompleteness: number | null;
}

export interface UtilisationRow extends UtilisationFigures {
  userId: string;
  name: string;
  position: string | null;
}

export interface UtilisationReport {
  rows: UtilisationRow[];
  totals: UtilisationFigures;
  /** True while any month in the range can still be edited. */
  isProvisional: boolean;
}

type Minutes = Omit<
  UtilisationFigures,
  | 'billableUtilisation'
  | 'clientShare'
  | 'nonBillableClientShare'
  | 'loggingCompleteness'
>;

const NO_MINUTES: Minutes = {
  capacityMinutes: 0,
  absenceMinutes: 0,
  availableMinutes: 0,
  loggedMinutes: 0,
  billableMinutes: 0,
  clientMinutes: 0,
  nonBillableClientMinutes: 0,
};

const addMinutes = (a: Minutes, b: Minutes): Minutes => {
  const sum = { ...a };
  for (const key of Object.keys(sum) as (keyof Minutes)[]) {
    sum[key] += b[key];
  }
  return sum;
};

/** A share of a whole, or null when there is nothing to measure against. */
const ratio = (part: number, whole: number): number | null =>
  whole > 0 ? part / whole : null;

const withRatios = (minutes: Minutes): UtilisationFigures => ({
  ...minutes,
  billableUtilisation: ratio(minutes.billableMinutes, minutes.availableMinutes),
  clientShare: ratio(minutes.clientMinutes, minutes.loggedMinutes),
  nonBillableClientShare: ratio(
    minutes.nonBillableClientMinutes,
    minutes.clientMinutes,
  ),
  loggingCompleteness: ratio(minutes.loggedMinutes, minutes.availableMinutes),
});

/**
 * Utilisation per person. Capacity and absences are read separately rather
 * than through the expected figure, and only for days that have finished, so a
 * month in progress is not measured against days still to come. Logged time
 * comes from the hours report, so the client and internal split matches it.
 *
 * Lives beside ReportingService rather than in it because capacity already
 * depends on reporting for the period lock.
 */
@Injectable()
export class UtilisationService {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly expectedHours: ExpectedHoursService,
    private readonly teamVisibility: TeamVisibilityService,
  ) {}

  async getUtilisation(
    user: AuthUser,
    query: UtilisationQuery,
  ): Promise<UtilisationReport> {
    const { dateFrom, dateTo } = query;

    const hours = await this.reportingService.getHoursReport(user, {
      dateFrom,
      dateTo,
      groupBy: HoursReportGroupBy.PERSON,
    });

    const hoursByUser = new Map(hours.rows.map((row) => [row.id!, row]));

    // The same people the team grid lists, plus deactivated people who
    // logged time in the range.
    const people = await this.teamVisibility.findVisibleUsers(user, {
      includeUserIds: [...hoursByUser.keys()],
    });

    const availability = await this.expectedHours.availabilityToDateFor(
      user.companyId,
      people.map((person) => person.id),
      dateFrom,
      dateTo,
    );

    const minutesByPerson = people.map((person) => ({
      person,
      minutes: this.minutesFor(
        availability.get(person.id),
        hoursByUser.get(person.id),
      ),
    }));

    const totalMinutes = minutesByPerson
      .map(({ minutes }) => minutes)
      .reduce(addMinutes, NO_MINUTES);

    return {
      rows: minutesByPerson.map(({ person, minutes }) => ({
        userId: person.id,
        name: `${person.firstName} ${person.lastName}`,
        position: person.position ?? null,
        ...withRatios(minutes),
      })),
      totals: withRatios(totalMinutes),
      isProvisional: hours.isProvisional,
    };
  }

  private minutesFor(
    availability: Availability | undefined,
    hours: HoursReportRow | undefined,
  ): Minutes {
    const billableMinutes = hours?.billableMinutes ?? 0;
    const nonBillableClientMinutes = hours?.nonBillableMinutes ?? 0;

    return {
      capacityMinutes: availability?.capacityMinutes ?? 0,
      absenceMinutes: availability?.absenceMinutes ?? 0,
      availableMinutes: availability?.availableMinutes ?? 0,
      loggedMinutes: hours?.totalMinutes ?? 0,
      billableMinutes,
      clientMinutes: billableMinutes + nonBillableClientMinutes,
      nonBillableClientMinutes,
    };
  }
}
