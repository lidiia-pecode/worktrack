// src/companies/companies.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CurrentUser, Role } from 'src/lib/decorators';
import { CompanyResponseDto } from './dtos/company-response.dto';
import { UserRole } from 'src/users/enums/user-role.enum';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import {
  SetStandardDayPayload,
  StandardDayChangeParams,
} from './dtos/standard-day.dto';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { AccessGuard, RolesGuard } from 'src/auth/guards';
import { Serialize } from 'src/lib/interceptors';
import { CapacityService } from 'src/capacity/capacity.service';

@Controller('company')
@UseGuards(AccessGuard, RolesGuard)
@Serialize(CompanyResponseDto)
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly capacity: CapacityService,
  ) {}

  @Get()
  async findCurrentCompany(
    @CurrentUser() user: AuthUser,
  ): Promise<CompanyResponseDto> {
    return this.respond(user.companyId);
  }

  @Patch()
  @Role(UserRole.OWNER)
  async update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    await this.companiesService.update(user.companyId, dto);

    return this.respond(user.companyId);
  }

  @Post('standard-day')
  @Role(UserRole.OWNER)
  async setStandardDay(
    @CurrentUser() user: AuthUser,
    @Body() payload: SetStandardDayPayload,
  ): Promise<CompanyResponseDto> {
    await this.capacity.setStandardDay(
      user.companyId,
      payload.hoursPerDay,
      payload.validFrom,
      user.id,
    );

    return this.respond(user.companyId);
  }

  @Delete('standard-day/changes/:validFrom')
  @Role(UserRole.OWNER)
  async cancelStandardDayChange(
    @CurrentUser() user: AuthUser,
    @Param() params: StandardDayChangeParams,
  ): Promise<CompanyResponseDto> {
    await this.capacity.cancelStandardDayChange(
      user.companyId,
      params.validFrom,
    );

    return this.respond(user.companyId);
  }

  /** The company with the standard day in force today and its scheduled change. */
  private async respond(companyId: string): Promise<CompanyResponseDto> {
    const [company, standardDay] = await Promise.all([
      this.companiesService.findCurrentCompany(companyId),
      this.capacity.standardDayFor(companyId),
    ]);

    return {
      ...company,
      standardWorkHoursPerDay: standardDay.hoursPerDay,
      standardDayChange: standardDay.upcoming,
    };
  }
}
