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

import { TimeLogsService } from './time-logs.service';
import { TimeLogResponse } from './dtos/time-log-response.dto';
import {
  TimeLogPayload,
  UpdateTimeLogPayload,
} from './dtos/time-log-payload.dto';

import { Serialize, SerializeList } from 'src/lib/interceptors';
import { CurrentUser } from 'src/lib/decorators';
import { AccessGuard } from 'src/auth/guards';
import { TimeLogsQuery } from './dtos/time-logs-query.dto';
import { TeamSummaryQuery } from './dtos/team-summary-query.dto';
import { TeamSummaryResponse } from './dtos/team-summary-response.dto';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Controller('time-logs')
@UseGuards(AccessGuard)
export class TimeLogsController {
  constructor(private readonly timeLogsService: TimeLogsService) {}

  @Get()
  @SerializeList(TimeLogResponse)
  async getAllTimeLogs(
    @Query() query: TimeLogsQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.timeLogsService.list(query, user);
  }

  // Declared before ':id' so the path is not swallowed by the id route.
  @Get('summary')
  @Serialize(TeamSummaryResponse)
  async getTeamSummary(
    @Query() query: TeamSummaryQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.timeLogsService.getTeamSummary(query, user);
  }

  @Get(':id')
  @Serialize(TimeLogResponse)
  async getTimeLogById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.timeLogsService.getById(id, user);
  }

  @Post()
  @Serialize(TimeLogResponse)
  async createTimeLog(
    @Body() payload: TimeLogPayload,
    @CurrentUser() user: AuthUser,
  ) {
    return this.timeLogsService.create(payload, user);
  }

  @Patch(':id')
  @Serialize(TimeLogResponse)
  async updateTimeLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateTimeLogPayload,
    @CurrentUser() user: AuthUser,
  ) {
    return this.timeLogsService.update(id, payload, user);
  }

  @Delete(':id')
  async deleteTimeLog(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.timeLogsService.delete(id, user);
  }
}
