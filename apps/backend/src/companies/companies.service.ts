import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { Company } from './entities/company.entity';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { CompanyResponseDto } from './dtos/company-response.dto';
import { plainToInstance } from 'class-transformer';
import { CompanyStatus } from './enum/company-status.enum';

@Injectable()
export class CompaniesService {
  private static readonly MAX_SLUG_ATTEMPTS = 100;
  private static readonly MAX_SLUG_LENGTH = 100;
  private static readonly PG_UNIQUE_VIOLATION = '23505';
  private static readonly SLUG_UNIQUE_CONSTRAINT = 'UQ_companies_slug';

  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private buildBaseSlug(text: string): string {
    const slug = this.slugify(text);

    if (slug) {
      return slug.slice(0, CompaniesService.MAX_SLUG_LENGTH);
    }

    return `company-${Date.now()}`.slice(0, CompaniesService.MAX_SLUG_LENGTH);
  }

  private buildSlugCandidate(baseSlug: string, attempt: number): string {
    if (attempt === 0) {
      return baseSlug;
    }

    const suffix = `-${attempt}`;
    const maxBaseLength = CompaniesService.MAX_SLUG_LENGTH - suffix.length;

    return `${baseSlug.slice(0, maxBaseLength)}${suffix}`;
  }

  private isUniqueSlugViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as
      | {
          code?: string;
          constraint?: string;
        }
      | undefined;

    return (
      driverError?.code === CompaniesService.PG_UNIQUE_VIOLATION &&
      driverError?.constraint === CompaniesService.SLUG_UNIQUE_CONSTRAINT
    );
  }

  async create(
    name: string,
    repository: Repository<Company> = this.companiesRepository,
  ): Promise<Company> {
    const companyName = name.trim();

    if (!companyName) {
      throw new BadRequestException('Company name is required.');
    }

    const baseSlug = this.buildBaseSlug(companyName);

    for (
      let attempt = 0;
      attempt < CompaniesService.MAX_SLUG_ATTEMPTS;
      attempt++
    ) {
      const slug = this.buildSlugCandidate(baseSlug, attempt);

      const company = repository.create({
        companyName,
        slug,
        status: CompanyStatus.ACTIVE,
        timezone: 'UTC',
        currency: 'USD',
      });

      try {
        return await repository.save(company);
      } catch (error) {
        if (!this.isUniqueSlugViolation(error)) {
          throw error;
        }
      }
    }

    throw new ConflictException('Unable to generate a unique company slug.');
  }

  async findCurrentCompany(companyId: string): Promise<Company> {
    return this.findById(companyId);
  }

  async findById(id: string): Promise<Company> {
    const company = await this.companiesRepository.findOne({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    return company;
  }

  async ensureCompanyIsActive(companyId: string): Promise<Company> {
    const company = await this.findById(companyId);

    if (company.status === CompanyStatus.SUSPENDED) {
      throw new ForbiddenException('Company account is suspended.');
    }

    return company;
  }

  async findBySlug(slug: string): Promise<Company | null> {
    return this.companiesRepository.findOne({
      where: { slug },
    });
  }

  async update(companyId: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findById(companyId);

    if (company.status === CompanyStatus.SUSPENDED) {
      throw new ForbiddenException('Cannot update suspended company.');
    }

    const trimmedName = dto.companyName?.trim();

    if (trimmedName === undefined || trimmedName === company.companyName) {
      Object.assign(company, dto);
      return this.companiesRepository.save(company);
    }

    if (!trimmedName) {
      throw new BadRequestException('Company name cannot be empty.');
    }

    const baseSlug = this.buildBaseSlug(trimmedName);

    for (
      let attempt = 0;
      attempt < CompaniesService.MAX_SLUG_ATTEMPTS;
      attempt++
    ) {
      company.companyName = trimmedName;
      company.slug = this.buildSlugCandidate(baseSlug, attempt);

      try {
        return await this.companiesRepository.save(company);
      } catch (error) {
        if (!this.isUniqueSlugViolation(error)) {
          throw error;
        }
      }
    }

    throw new ConflictException('Unable to generate a unique company slug.');
  }

  toResponseDto(company: Company): CompanyResponseDto {
    return plainToInstance(CompanyResponseDto, company, {
      excludeExtraneousValues: true,
    });
  }
}
