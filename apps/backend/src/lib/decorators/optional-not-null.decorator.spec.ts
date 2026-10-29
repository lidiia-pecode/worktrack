import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { getMetadataStorage } from 'class-validator';

import { UpdateAbsencePayload } from 'src/absences/dtos/absence-payload.dto';
import { UpdateActivityPayload } from 'src/activities/dtos/activity-payload.dto';
import { UpdateCompanyDto } from 'src/companies/dtos/update-company.dto';
import { UpdatePlanningEntryDto } from 'src/planning/dtos/planning-entry-payload.dto';
import { UpdateProjectPayload } from 'src/projects/dtos/project-payload.dto';
import { UpdateTeamDto, UpdateTeamMemberDto } from 'src/teams/dtos/team.dto';
import { UpdateTimeLogPayload } from 'src/time-logs/dtos/time-log-payload.dto';
import { UpdateProfilePayload } from 'src/users/dtos/update-profile-payload.dto';
import { UpdateUserPayload } from 'src/users/dtos/user-payload.dto';

// The same options as the global pipe in main.ts.
const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
});

type UpdateDto = new () => object;

/** Every field of every update payload: nullable ones match a nullable column. */
const UPDATE_PAYLOADS: {
  dto: UpdateDto;
  required: string[];
  nullable: string[];
}[] = [
  {
    dto: UpdateTimeLogPayload,
    required: ['projectActivityId', 'minutes', 'date', 'isBillable'],
    nullable: ['note'],
  },
  {
    dto: UpdateAbsencePayload,
    required: ['type', 'startDate', 'endDate'],
    nullable: ['note'],
  },
  {
    dto: UpdatePlanningEntryDto,
    required: ['projectId', 'date', 'plannedMinutes'],
    nullable: ['note'],
  },
  {
    dto: UpdateUserPayload,
    required: ['firstName', 'lastName', 'role'],
    nullable: ['position'],
  },
  {
    dto: UpdateProfilePayload,
    required: ['firstName', 'lastName'],
    nullable: ['avatarUrl'],
  },
  {
    dto: UpdateProjectPayload,
    required: ['name', 'activityIds', 'userIds'],
    nullable: ['clientName', 'description'],
  },
  {
    dto: UpdateActivityPayload,
    required: ['name', 'categoryId', 'defaultBillable'],
    nullable: [],
  },
  {
    dto: UpdateTeamDto,
    required: ['name'],
    nullable: [],
  },
  {
    dto: UpdateTeamMemberDto,
    required: ['roleInTeam', 'leaveCurrentTeam'],
    nullable: [],
  },
  {
    dto: UpdateCompanyDto,
    required: [
      'companyName',
      'timezone',
      'currency',
      'weekStartDay',
      'standardWorkHoursPerDay',
    ],
    nullable: [],
  },
];

const validateBody = (dto: UpdateDto, body: Record<string, unknown>) =>
  pipe.transform(body, { type: 'body', metatype: dto });

const fieldsOf = (dto: UpdateDto) =>
  new Set(
    getMetadataStorage()
      .getTargetValidationMetadatas(dto, '', true, false)
      .map((metadata) => metadata.propertyName),
  );

const payloads = UPDATE_PAYLOADS.map((payload) => ({
  ...payload,
  name: payload.dto.name,
}));
const requiredFields = payloads.flatMap(({ dto, name, required }) =>
  required.map((field) => ({ dto, name, field })),
);
const nullableFields = payloads.flatMap(({ dto, name, nullable }) =>
  nullable.map((field) => ({ dto, name, field })),
);

describe('null in update payloads', () => {
  it.each(payloads)(
    '$name lists every field',
    ({ dto, required, nullable }) => {
      expect([...fieldsOf(dto)].sort()).toEqual(
        [...required, ...nullable].sort(),
      );
    },
  );

  it.each(requiredFields)(
    '$name refuses null in $field',
    async ({ dto, field }) => {
      await expect(validateBody(dto, { [field]: null })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it.each(nullableFields)(
    '$name accepts null in $field',
    async ({ dto, field }) => {
      await expect(validateBody(dto, { [field]: null })).resolves.toBeDefined();
    },
  );

  it.each(payloads)(
    '$name still lets every field be left out',
    async ({ dto }) => {
      await expect(validateBody(dto, {})).resolves.toBeDefined();
    },
  );
});
