// src/companies/companies.controller.ts
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CurrentUser, Role } from 'src/lib/decorators';
import { CompanyResponseDto } from './dtos/company-response.dto';
import { UserRole } from 'src/users/enums/UserRole.enum';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { AccessGuard, RolesGuard } from 'src/auth/guards';

@Controller('company')
@UseGuards(AccessGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async findCurrentCompany(
    @CurrentUser() user: AuthUser,
  ): Promise<CompanyResponseDto> {
    const company = await this.companiesService.findCurrentCompany(
      user.companyId,
    );
    return this.companiesService.toResponseDto(company);
  }

  @Patch()
  @Role(UserRole.ADMIN, UserRole.OWNER)
  async update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    const company = await this.companiesService.update(user.companyId, dto);
    return this.companiesService.toResponseDto(company);
  }
}
