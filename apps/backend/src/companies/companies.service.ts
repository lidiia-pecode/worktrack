import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { Repository } from 'typeorm';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { CompanyResponseDto } from './dtos/company-response.dto';
import { plainToInstance } from 'class-transformer';
import { CompanyStatus } from './enum/company-status.enum';

@Injectable()
export class CompaniesService {
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

    if (dto.name && dto.name !== company.name) {
      let newSlug = this.slugify(dto.name);

      const existingCompany = await this.findBySlug(newSlug);
      if (existingCompany && existingCompany.id !== companyId) {
        newSlug = `${newSlug}-${Date.now().toString().slice(-4)}`;
      }

      company.slug = newSlug;
    }

    Object.assign(company, dto);

    return this.companiesRepository.save(company);
  }
  toResponseDto(company: Company): CompanyResponseDto {
    return plainToInstance(CompanyResponseDto, company, {
      excludeExtraneousValues: true,
    });
  }
}
